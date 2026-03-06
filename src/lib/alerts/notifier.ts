import { resend, fromEmail } from "@/lib/resend";
import { formatPrice } from "@/lib/utils/format";
import type { TrackedProduct } from "@/lib/types/database";

interface AlertData {
  ruleId: string;
  ruleType: string;
  message: string;
  oldValue: string | null;
  newValue: string | null;
}

const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function wrapHtml(body: string, footerUrl: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Inter','Helvetica Neue',Arial,sans-serif;background:#f8f9fa">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;text-align:center">
<div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-.02em">WebSpy</div>
</div>
<div style="padding:32px">${body}</div>
<div style="padding:16px 32px;border-top:1px solid #f1f5f9;background:#fafafa;text-align:center">
<p style="font-size:11px;color:#94a3b8;margin:0">You received this because you have alert rules configured in WebSpy.
<a href="${footerUrl}/settings" style="color:#6366f1;text-decoration:none">Manage preferences</a></p>
</div></div></body></html>`;
}

function priceAlertHtml(productName: string, productUrl: string, alertMessage: string, currentPrice: string, stockStatus: string | null, detailUrl: string): string {
  const stockHtml = stockStatus
    ? `<div style="margin-top:12px"><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Stock</div><div style="font-size:14px;font-weight:500;color:#475569;margin-top:2px">${stockStatus.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div></div>`
    : "";

  return wrapHtml(`
<h1 style="font-size:18px;font-weight:600;color:#1e293b;margin:0 0 16px">Price Alert</h1>
<p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">${alertMessage}</p>
<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px">
<div style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:4px">${productName}</div>
<a href="${productUrl}" style="font-size:12px;color:#6366f1;text-decoration:none">${productUrl}</a>
<div style="margin-top:16px"><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Current Price</div>
<div style="font-size:24px;font-weight:700;color:#1e293b">${currentPrice}</div></div>
${stockHtml}
</div>
<a href="${detailUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none">View in WebSpy</a>
`, BASE_URL);
}

function stockAlertHtml(productName: string, productUrl: string, oldStatus: string, newStatus: string, currentPrice: string, detailUrl: string): string {
  const isBack = newStatus === "in_stock";
  const fmt = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return wrapHtml(`
<h1 style="font-size:18px;font-weight:600;color:#1e293b;margin:0 0 16px">Stock Alert</h1>
<p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px"><strong>${productName}</strong> stock status changed.</p>
<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px">
<div style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:12px">${productName}</div>
<a href="${productUrl}" style="font-size:12px;color:#6366f1;text-decoration:none">${productUrl}</a>
<div style="margin-top:16px;display:flex;align-items:center;gap:12px">
<span style="padding:4px 10px;border-radius:4px;font-size:13px;font-weight:500;background:#fee2e2;color:#991b1b">${fmt(oldStatus)}</span>
<span style="color:#94a3b8;font-size:16px">&rarr;</span>
<span style="padding:4px 10px;border-radius:4px;font-size:13px;font-weight:500;background:${isBack ? "#dcfce7" : "#fef3c7"};color:${isBack ? "#166534" : "#92400e"}">${fmt(newStatus)}</span>
</div>
<div style="margin-top:12px"><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Current Price</div>
<div style="font-size:20px;font-weight:700;color:#1e293b">${currentPrice}</div></div>
</div>
<a href="${detailUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none">View in WebSpy</a>
`, BASE_URL);
}

export async function sendAlertNotification(
  alert: AlertData,
  product: TrackedProduct,
  userEmail: string
): Promise<boolean> {
  const productName = product.product_name || "Product";
  const productDetailUrl = `${BASE_URL}/projects/${product.project_id}/products/${product.id}`;

  console.log(`[notifier] === SENDING EMAIL ===`);
  console.log(`[notifier] To: ${userEmail}`);
  console.log(`[notifier] From: ${fromEmail}`);
  console.log(`[notifier] Rule type: ${alert.ruleType}`);
  console.log(`[notifier] Product: "${productName}"`);
  console.log(`[notifier] Message: ${alert.message}`);

  try {
    let subject: string;
    let html: string;

    if (alert.ruleType === "stock_change") {
      const statusText = alert.newValue === "out_of_stock" ? "Out of Stock" : "Back in Stock";
      subject = `⚠️ Stock Alert: ${productName} is now ${statusText}`;
      html = stockAlertHtml(
        productName,
        product.url,
        alert.oldValue || "unknown",
        alert.newValue || "unknown",
        formatPrice(product.last_price, product.currency),
        productDetailUrl,
      );
    } else {
      const descriptions: Record<string, string> = {
        price_drop_percent: "Price Dropped",
        price_drop_absolute: "Price Dropped",
        price_below: "Price Below Threshold",
        price_above: "Price Above Threshold",
        price_increases: "Price Increased",
        competitor_undercuts_me: "Competitor Undercut",
      };
      subject = `🔔 Price Alert: ${productName} — ${descriptions[alert.ruleType] || "Price Change"}`;
      html = priceAlertHtml(
        productName,
        product.url,
        alert.message,
        formatPrice(
          alert.newValue ? parseFloat(alert.newValue) : product.last_price,
          product.currency,
        ),
        product.last_stock_status,
        productDetailUrl,
      );
    }

    console.log(`[notifier] Subject: ${subject}`);
    console.log(`[notifier] >>> Calling resend.emails.send() NOW...`);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject,
      html,
    });

    console.log(`[notifier] <<< Resend responded:`, JSON.stringify({ data, error }));

    if (error) {
      console.error(`[notifier] FAILED: ${error.message}`);
      return false;
    }

    console.log(`[notifier] SUCCESS — email sent to ${userEmail}`);
    return true;
  } catch (err) {
    console.error(`[notifier] EXCEPTION:`, err);
    return false;
  }
}
