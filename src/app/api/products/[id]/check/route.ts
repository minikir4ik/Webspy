import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeProduct } from "@/lib/scrapers/router";
import { evaluateAlerts } from "@/lib/alerts/evaluator";
import type { TrackedProduct, PriceCheck } from "@/lib/types/database";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  console.log(`[check] Starting check for product ${productId}`);

  try {
    // Verify the user is authenticated and owns this product
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[check] Not authenticated");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log(`[check] User ${user.id} requesting check`);

    const { data: product, error: productError } = await supabase
      .from("tracked_products")
      .select("*")
      .eq("id", productId)
      .eq("user_id", user.id)
      .single();

    if (productError) {
      console.error("[check] DB error fetching product:", productError.message);
    }

    if (!product) {
      console.log("[check] Product not found");
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const trackedProduct = product as TrackedProduct;
    console.log(
      `[check] Scraping ${trackedProduct.url} (platform: ${trackedProduct.platform})`
    );

    // Run the scraper
    const result = await scrapeProduct(
      trackedProduct.url,
      trackedProduct.platform
    );
    console.log(`[check] Scrape result:`, {
      status: result.status,
      price: result.price,
      error: result.error,
      confidence: result.confidence,
    });

    // Use admin client for writes (bypasses RLS for price_checks insert)
    const admin = createAdminClient();
    const now = new Date().toISOString();

    if (result.status === "success") {
      // Insert price check record
      const { error: insertError } = await admin
        .from("price_checks")
        .insert({
          product_id: productId,
          price: result.price ?? null,
          original_price: result.originalPrice ?? null,
          currency: result.currency ?? trackedProduct.currency,
          stock_status: result.stockStatus ?? null,
          stock_quantity: result.stockQuantity ?? null,
          raw_extraction: result.rawData ?? null,
          confidence: result.confidence ?? 1.0,
          checked_at: now,
        });

      if (insertError) {
        console.error(
          "[check] Failed to insert price_check:",
          insertError.message
        );
      }

      // Calculate next check time based on user's check interval
      const { data: profile } = await admin
        .from("profiles")
        .select("check_interval_minutes")
        .eq("id", user.id)
        .single();

      const intervalMinutes =
        trackedProduct.check_interval_override ??
        profile?.check_interval_minutes ??
        1440;
      const nextCheck = new Date(
        Date.now() + intervalMinutes * 60 * 1000
      ).toISOString();

      // Update the tracked product
      const { error: updateError } = await admin
        .from("tracked_products")
        .update({
          last_price: result.price ?? null,
          last_stock_status: result.stockStatus ?? null,
          last_check_at: now,
          next_check_at: nextCheck,
          product_name: result.productName ?? trackedProduct.product_name,
          consecutive_failures: 0,
          status: "active",
        })
        .eq("id", productId);

      if (updateError) {
        console.error(
          "[check] Failed to update tracked_product:",
          updateError.message
        );
      }

      // Evaluate alert rules
      const newCheck: PriceCheck = {
        id: "",
        product_id: productId,
        price: result.price ?? null,
        original_price: result.originalPrice ?? null,
        currency: result.currency ?? trackedProduct.currency,
        stock_status: result.stockStatus ?? null,
        stock_quantity: result.stockQuantity ?? null,
        raw_extraction: null,
        confidence: result.confidence ?? 1.0,
        checked_at: now,
      };

      // Get previous check for comparison
      const { data: prevChecks } = await admin
        .from("price_checks")
        .select("*")
        .eq("product_id", productId)
        .order("checked_at", { ascending: false })
        .limit(2);

      // The most recent is the one we just inserted, so previous is index 1
      const previousCheck =
        prevChecks && prevChecks.length > 1
          ? (prevChecks[1] as PriceCheck)
          : null;

      try {
        const triggeredAlerts = await evaluateAlerts(
          trackedProduct,
          newCheck,
          previousCheck
        );
        if (triggeredAlerts.length > 0) {
          console.log(
            `[check] Triggered ${triggeredAlerts.length} alert(s):`,
            triggeredAlerts.map((a) => a.message)
          );
        }
      } catch (alertErr) {
        console.error("[check] Alert evaluation error:", alertErr);
      }

      console.log(
        `[check] Success: price=${result.price}, next_check=${nextCheck}`
      );

      return NextResponse.json({
        status: "success",
        price: result.price,
        originalPrice: result.originalPrice,
        currency: result.currency,
        stockStatus: result.stockStatus,
        stockQuantity: result.stockQuantity,
        productName: result.productName,
        confidence: result.confidence,
      });
    } else {
      // Scrape failed — increment consecutive failures
      const newFailures = trackedProduct.consecutive_failures + 1;
      const newStatus = newFailures >= 5 ? "broken" : trackedProduct.status;

      const { error: updateError } = await admin
        .from("tracked_products")
        .update({
          consecutive_failures: newFailures,
          status: newStatus,
          last_check_at: now,
        })
        .eq("id", productId);

      if (updateError) {
        console.error(
          "[check] Failed to update failures:",
          updateError.message
        );
      }

      console.log(
        `[check] Failed: ${result.error} (failures: ${newFailures})`
      );

      return NextResponse.json(
        {
          status: "failed",
          error: result.error,
          consecutiveFailures: newFailures,
        },
        { status: 422 }
      );
    }
  } catch (err) {
    console.error("[check] Unhandled error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
