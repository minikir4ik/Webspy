import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeProduct } from "@/lib/scrapers/router";
import type { TrackedProduct } from "@/lib/types/database";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: products } = await supabase
    .from("tracked_products")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .in("status", ["active", "pending"]);

  if (!products || products.length === 0) {
    return NextResponse.json({ checked: 0, succeeded: 0, failed: 0 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const product of products as TrackedProduct[]) {
    // Skip recently checked products
    if (product.last_check_at) {
      const elapsed = now - new Date(product.last_check_at).getTime();
      if (elapsed < STALE_THRESHOLD_MS) {
        skipped++;
        continue;
      }
    }

    const result = await scrapeProduct(product.url, product.platform);
    const checkedAt = new Date().toISOString();

    if (result.status === "success") {
      await admin.from("price_checks").insert({
        product_id: product.id,
        price: result.price ?? null,
        original_price: result.originalPrice ?? null,
        currency: result.currency ?? product.currency,
        stock_status: result.stockStatus ?? null,
        stock_quantity: result.stockQuantity ?? null,
        raw_extraction: result.rawData ?? null,
        confidence: result.confidence ?? 1.0,
        checked_at: checkedAt,
      });

      const { data: profile } = await admin
        .from("profiles")
        .select("check_interval_minutes")
        .eq("id", user.id)
        .single();

      const intervalMinutes =
        product.check_interval_override ??
        profile?.check_interval_minutes ??
        1440;
      const nextCheck = new Date(
        Date.now() + intervalMinutes * 60 * 1000
      ).toISOString();

      await admin
        .from("tracked_products")
        .update({
          last_price: result.price ?? null,
          last_stock_status: result.stockStatus ?? null,
          last_check_at: checkedAt,
          next_check_at: nextCheck,
          product_name: result.productName ?? product.product_name,
          consecutive_failures: 0,
          status: "active",
        })
        .eq("id", product.id);

      succeeded++;
    } else {
      const newFailures = product.consecutive_failures + 1;
      await admin
        .from("tracked_products")
        .update({
          consecutive_failures: newFailures,
          status: newFailures >= 5 ? "broken" : product.status,
          last_check_at: checkedAt,
        })
        .eq("id", product.id);

      failed++;
    }

    // Small delay between scrapes to avoid rate limits
    await delay(500);
  }

  return NextResponse.json({
    checked: succeeded + failed,
    succeeded,
    failed,
    skipped,
  });
}
