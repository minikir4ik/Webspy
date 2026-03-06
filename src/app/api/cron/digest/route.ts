import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, fromEmail } from "@/lib/resend";

const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface PriceChange {
  productName: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  currency: string;
}

function formatCurrency(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
}

function buildDigestHtml(date: string, totalChecked: number, totalChanges: number, topChanges: PriceChange[]): string {
  const changesRows = topChanges.map(c => {
    const isDown = c.changePercent < 0;
    const color = isDown ? "#16a34a" : "#e11d48";
    const sign = c.changePercent > 0 ? "+" : "";
    return `<tr style="border-bottom:1px solid #f1f5f9">
<td style="padding:8px 4px;font-size:13px;color:#1e293b;font-weight:500">${c.productName}</td>
<td style="padding:8px 4px;font-size:13px;color:#64748b;text-align:right">${formatCurrency(c.oldPrice, c.currency)}</td>
<td style="padding:8px 4px;font-size:13px;color:#1e293b;font-weight:600;text-align:right">${formatCurrency(c.newPrice, c.currency)}</td>
<td style="padding:8px 4px;font-size:13px;font-weight:600;text-align:right;color:${color}">${sign}${c.changePercent.toFixed(1)}%</td>
</tr>`;
  }).join("");

  const tableHtml = topChanges.length > 0
    ? `<h2 style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 12px">Biggest Price Changes</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
<thead><tr style="border-bottom:2px solid #f1f5f9">
<th style="text-align:left;padding:8px 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Product</th>
<th style="text-align:right;padding:8px 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Old</th>
<th style="text-align:right;padding:8px 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">New</th>
<th style="text-align:right;padding:8px 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Change</th>
</tr></thead><tbody>${changesRows}</tbody></table>`
    : `<p style="font-size:14px;color:#94a3b8;text-align:center;margin:0 0 24px">No price changes detected in the last 24 hours.</p>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Inter','Helvetica Neue',Arial,sans-serif;background:#f8f9fa">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;text-align:center">
<div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-.02em">WebSpy</div>
</div>
<div style="padding:32px">
<h1 style="font-size:18px;font-weight:600;color:#1e293b;margin:0 0 4px">Daily Digest</h1>
<p style="font-size:13px;color:#94a3b8;margin:0 0 24px">${date}</p>
<div style="display:flex;gap:16px;margin-bottom:24px">
<div style="flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center">
<div style="font-size:24px;font-weight:700;color:#1e293b">${totalChecked}</div>
<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Checked</div>
</div>
<div style="flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center">
<div style="font-size:24px;font-weight:700;color:${totalChanges > 0 ? "#6366f1" : "#1e293b"}">${totalChanges}</div>
<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Changes</div>
</div>
</div>
${tableHtml}
<a href="${BASE_URL}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none">View Dashboard</a>
</div>
<div style="padding:16px 32px;border-top:1px solid #f1f5f9;background:#fafafa;text-align:center">
<p style="font-size:11px;color:#94a3b8;margin:0">You received this daily digest from WebSpy.
<a href="${BASE_URL}/settings" style="color:#6366f1;text-decoration:none">Manage preferences</a></p>
</div></div></body></html>`;
}

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
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email");

    if (!profiles || profiles.length === 0) {
      console.log("[digest] No profiles found");
      return NextResponse.json({ sent: 0 });
    }

    let totalSent = 0;

    for (const profile of profiles) {
      const p = profile as { id: string; email: string | null };
      if (!p.email) continue;

      // Check daily_digest preference (column may not exist yet)
      try {
        const { data: prefs } = await admin
          .from("profiles")
          .select("daily_digest")
          .eq("id", p.id)
          .single();
        if (prefs && (prefs as { daily_digest?: boolean }).daily_digest === false) {
          console.log(`[digest] User ${p.id}: daily digest disabled`);
          continue;
        }
      } catch {
        // Column doesn't exist yet, continue
      }

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

      const { data: recentChecks } = await admin
        .from("price_checks")
        .select("*")
        .in("product_id", productIds)
        .gte("checked_at", twentyFourHoursAgo)
        .order("checked_at", { ascending: true });

      if (!recentChecks) continue;

      const totalChecked = new Set(recentChecks.map((c: { product_id: string }) => c.product_id)).size;

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

      priceChanges.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      const topChanges = priceChanges.slice(0, 5);

      if (totalChecked === 0) continue;

      try {
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: p.email,
          subject: `📊 WebSpy Daily Digest — ${dateStr}`,
          html: buildDigestHtml(dateStr, totalChecked, priceChanges.length, topChanges),
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
