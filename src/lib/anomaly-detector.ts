import { createAdminClient } from "@/lib/supabase/admin";
import { resend, fromEmail } from "@/lib/resend";
import type { TrackedProduct, PriceCheck, AnomalyType, AnomalySeverity } from "@/lib/types/database";

const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface DetectedAnomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
}

export async function detectAnomalies(
  product: TrackedProduct,
  newCheck: PriceCheck,
  userEmail: string | null
): Promise<DetectedAnomaly[]> {
  const admin = createAdminClient();
  const detected: DetectedAnomaly[] = [];

  // Get historical price checks (last 30)
  const { data: history } = await admin
    .from("price_checks")
    .select("price, stock_status, checked_at")
    .eq("product_id", product.id)
    .order("checked_at", { ascending: false })
    .limit(30);

  if (!history || history.length < 5) return detected; // Need enough data

  const prices = (history as { price: number | null }[])
    .map((h) => h.price)
    .filter((p): p is number => p !== null);

  if (prices.length < 5 || newCheck.price === null) return detected;

  // Calculate mean and stddev
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + (b - mean) ** 2, 0) / prices.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) return detected; // No variance

  const deviation = Math.abs(newCheck.price - mean) / stddev;
  const prevPrice = prices[0]; // Most recent before this check
  const changePercent = prevPrice > 0 ? ((newCheck.price - prevPrice) / prevPrice) * 100 : 0;

  // Price anomaly: >2 standard deviations from mean
  if (deviation > 2) {
    const severity: AnomalySeverity = deviation > 4 ? "high" : deviation > 3 ? "medium" : "low";
    const type: AnomalyType = newCheck.price < mean ? "price_crash" : "price_spike";
    const direction = type === "price_crash" ? "dropped" : "spiked";
    const description = `${product.product_name || "Product"} price ${direction} ${Math.abs(changePercent).toFixed(1)}% ($${prevPrice.toFixed(2)} → $${newCheck.price.toFixed(2)}) — this is ${deviation.toFixed(1)}x the normal variation`;

    detected.push({ type, severity, description });
  }

  // Stock anomaly: sudden change
  const lastStockStatuses = (history as { stock_status: string | null }[])
    .map((h) => h.stock_status)
    .filter(Boolean);
  if (
    newCheck.stock_status &&
    lastStockStatuses.length >= 3 &&
    lastStockStatuses.slice(0, 3).every((s) => s === lastStockStatuses[0]) &&
    newCheck.stock_status !== lastStockStatuses[0]
  ) {
    const wasInStock = lastStockStatuses[0] === "in_stock";
    if (wasInStock && newCheck.stock_status === "out_of_stock") {
      detected.push({
        type: "unusual_stock_change",
        severity: "medium",
        description: `${product.product_name || "Product"} suddenly went out of stock after being consistently in stock`,
      });
    }
  }

  // Save anomalies and send notifications
  for (const anomaly of detected) {
    const { error: insertError } = await admin.from("anomalies").insert({
      product_id: product.id,
      user_id: product.user_id,
      type: anomaly.type,
      severity: anomaly.severity,
      description: anomaly.description,
    });

    if (insertError) {
      console.error("[anomaly] Failed to insert:", insertError.message);
      continue;
    }

    console.log(`[anomaly] Detected: ${anomaly.type} (${anomaly.severity}) — ${anomaly.description}`);

    // Send email
    if (userEmail) {
      try {
        const severityEmoji = anomaly.severity === "high" ? "🚨" : anomaly.severity === "medium" ? "⚠️" : "ℹ️";
        const detailUrl = `${BASE_URL}/projects/${product.project_id}/products/${product.id}`;

        await resend.emails.send({
          from: fromEmail,
          to: userEmail,
          subject: `${severityEmoji} Unusual Activity: ${product.product_name || "Product"}`,
          html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Inter','Helvetica Neue',Arial,sans-serif;background:#f8f9fa">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<div style="background:linear-gradient(135deg,#dc2626,#ea580c);padding:24px 32px;text-align:center">
<div style="font-size:20px;font-weight:700;color:#fff">${severityEmoji} Anomaly Detected</div>
</div>
<div style="padding:32px">
<h1 style="font-size:18px;font-weight:600;color:#1e293b;margin:0 0 16px">${anomaly.description}</h1>
<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px">
<div style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:4px">${product.product_name || "Product"}</div>
<div style="display:flex;gap:16px;margin-top:12px">
<div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase">Severity</div>
<div style="font-size:14px;font-weight:600;color:${anomaly.severity === "high" ? "#dc2626" : anomaly.severity === "medium" ? "#ea580c" : "#6366f1"};margin-top:2px">${anomaly.severity.toUpperCase()}</div></div>
<div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase">Type</div>
<div style="font-size:14px;font-weight:500;color:#475569;margin-top:2px">${anomaly.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</div></div>
</div></div>
<a href="${detailUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none">View Product</a>
</div>
<div style="padding:16px 32px;border-top:1px solid #f1f5f9;background:#fafafa;text-align:center">
<p style="font-size:11px;color:#94a3b8;margin:0">Anomaly detection by WebSpy.
<a href="${BASE_URL}/settings" style="color:#6366f1;text-decoration:none">Manage preferences</a></p>
</div></div></body></html>`,
        });
        console.log(`[anomaly] Email sent to ${userEmail}`);
      } catch (err) {
        console.error("[anomaly] Email failed:", err);
      }
    }
  }

  return detected;
}
