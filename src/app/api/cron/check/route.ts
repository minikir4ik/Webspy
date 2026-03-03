import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeProduct } from "@/lib/scrapers/router";
import { evaluateAlerts } from "@/lib/alerts/evaluator";
import type { TrackedProduct, PriceCheck } from "@/lib/types/database";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Fetch products that are due for checking
  const { data: products, error: queryError } = await admin
    .from("tracked_products")
    .select("*")
    .eq("status", "active")
    .lte("next_check_at", now)
    .order("next_check_at", { ascending: true })
    .limit(20);

  if (queryError) {
    console.error("[cron] Query error:", queryError.message);
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!products || products.length === 0) {
    return NextResponse.json({ checked: 0, succeeded: 0, failed: 0 });
  }

  console.log(`[cron] Processing ${products.length} products`);

  let succeeded = 0;
  let failed = 0;

  for (const product of products as TrackedProduct[]) {
    const result = await scrapeProduct(product.url, product.platform);
    const checkedAt = new Date().toISOString();

    if (result.status === "success") {
      // Insert price check
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

      // Get user's check interval
      const { data: profile } = await admin
        .from("profiles")
        .select("check_interval_minutes")
        .eq("id", product.user_id)
        .single();

      const intervalMinutes =
        product.check_interval_override ??
        profile?.check_interval_minutes ??
        1440;
      const nextCheck = new Date(
        Date.now() + intervalMinutes * 60 * 1000
      ).toISOString();

      // Update tracked product
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

      // Evaluate alerts
      const newCheck: PriceCheck = {
        id: "",
        product_id: product.id,
        price: result.price ?? null,
        original_price: result.originalPrice ?? null,
        currency: result.currency ?? product.currency,
        stock_status: result.stockStatus ?? null,
        stock_quantity: result.stockQuantity ?? null,
        raw_extraction: null,
        confidence: result.confidence ?? 1.0,
        checked_at: checkedAt,
      };

      const { data: prevChecks } = await admin
        .from("price_checks")
        .select("*")
        .eq("product_id", product.id)
        .order("checked_at", { ascending: false })
        .limit(2);

      const previousCheck =
        prevChecks && prevChecks.length > 1
          ? (prevChecks[1] as PriceCheck)
          : null;

      try {
        const triggered = await evaluateAlerts(product, newCheck, previousCheck);
        if (triggered.length > 0) {
          console.log(
            `[cron] Triggered ${triggered.length} alert(s) for ${product.product_name || product.url}`
          );
        }
      } catch (err) {
        console.error("[cron] Alert evaluation error:", err);
      }

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

    // Rate limit delay
    await delay(500);
  }

  console.log(
    `[cron] Done: ${succeeded} succeeded, ${failed} failed out of ${products.length}`
  );

  return NextResponse.json({
    checked: succeeded + failed,
    succeeded,
    failed,
  });
}
