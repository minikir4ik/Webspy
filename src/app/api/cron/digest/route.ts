import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, fromEmail } from "@/lib/resend";
import { DailyDigestEmail, dailyDigestSubject } from "@/lib/emails/daily-digest";

const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  console.log(`[digest] Starting daily digest for ${dateStr}`);

  try {
    // Get all users who have tracked products and daily_digest enabled
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email, daily_digest");

    if (!profiles || profiles.length === 0) {
      console.log("[digest] No profiles found");
      return NextResponse.json({ sent: 0 });
    }

    let totalSent = 0;

    for (const profile of profiles) {
      const p = profile as { id: string; email: string | null; daily_digest?: boolean };
      if (!p.email) continue;
      if (p.daily_digest === false) {
        console.log(`[digest] User ${p.id}: daily digest disabled, skipping`);
        continue;
      }

      // Get user's tracked products
      const { data: products } = await admin
        .from("tracked_products")
        .select("id, product_name, currency")
        .eq("user_id", p.id)
        .eq("status", "active");

      if (!products || products.length === 0) continue;

      const productIds = products.map((pr: { id: string }) => pr.id);
      const productMap = new Map(
        products.map((pr: { id: string; product_name: string | null; currency: string }) => [pr.id, pr])
      );

      // Get price checks from last 24 hours for these products
      const { data: recentChecks } = await admin
        .from("price_checks")
        .select("*")
        .in("product_id", productIds)
        .gte("checked_at", twentyFourHoursAgo)
        .order("checked_at", { ascending: true });

      if (!recentChecks) continue;

      const totalChecked = new Set(recentChecks.map((c: { product_id: string }) => c.product_id)).size;

      // Find price changes: compare first and last check per product within 24h
      interface PriceChange {
        productName: string;
        oldPrice: number;
        newPrice: number;
        changePercent: number;
        currency: string;
      }

      const checksByProduct = new Map<string, { price: number | null; checked_at: string }[]>();
      for (const check of recentChecks as { product_id: string; price: number | null; checked_at: string }[]) {
        if (!checksByProduct.has(check.product_id)) {
          checksByProduct.set(check.product_id, []);
        }
        checksByProduct.get(check.product_id)!.push(check);
      }

      const priceChanges: PriceChange[] = [];
      for (const [productId, checks] of checksByProduct.entries()) {
        if (checks.length < 2) continue;
        const first = checks[0];
        const last = checks[checks.length - 1];
        if (first.price === null || last.price === null || first.price === 0) continue;
        if (first.price === last.price) continue;

        const prod = productMap.get(productId);
        const changePercent = ((last.price - first.price) / first.price) * 100;
        priceChanges.push({
          productName: (prod as { product_name: string | null })?.product_name || "Product",
          oldPrice: first.price,
          newPrice: last.price,
          changePercent,
          currency: (prod as { currency: string })?.currency || "USD",
        });
      }

      // Sort by absolute change, take top 5
      priceChanges.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      const topChanges = priceChanges.slice(0, 5);

      // Only send if there were actual checks
      if (totalChecked === 0) continue;

      try {
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: p.email,
          subject: dailyDigestSubject(dateStr),
          react: DailyDigestEmail({
            date: dateStr,
            totalChecked,
            totalChanges: priceChanges.length,
            topChanges,
            dashboardUrl: BASE_URL,
          }),
        });

        if (error) {
          console.error(`[digest] Failed to send to ${p.email}: ${error.message}`);
        } else {
          console.log(`[digest] Sent digest to ${p.email} (${totalChecked} checked, ${priceChanges.length} changes)`);
          totalSent++;
        }
      } catch (err) {
        console.error(`[digest] Error sending to ${p.email}:`, err);
      }
    }

    console.log(`[digest] Complete. Sent ${totalSent} digest(s).`);
    return NextResponse.json({ sent: totalSent });
  } catch (err) {
    console.error("[digest] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
