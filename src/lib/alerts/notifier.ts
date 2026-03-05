import { resend, fromEmail } from "@/lib/resend";
import { PriceAlertEmail, priceAlertSubject } from "@/lib/emails/price-alert";
import { StockAlertEmail, stockAlertSubject } from "@/lib/emails/stock-alert";
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

export async function sendAlertNotification(
  alert: AlertData,
  product: TrackedProduct,
  userEmail: string
): Promise<boolean> {
  const productName = product.product_name || "Product";
  const productDetailUrl = `${BASE_URL}/projects/${product.project_id}/products/${product.id}`;

  try {
    if (alert.ruleType === "stock_change") {
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: stockAlertSubject(productName, alert.newValue || "unknown"),
        react: StockAlertEmail({
          productName,
          productUrl: product.url,
          oldStatus: alert.oldValue || "unknown",
          newStatus: alert.newValue || "unknown",
          currentPrice: formatPrice(product.last_price, product.currency),
          productDetailUrl,
        }),
      });

      if (error) {
        console.error(`[notifier] Failed to send stock alert email: ${error.message}`);
        return false;
      }
    } else {
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: priceAlertSubject(productName, alert.ruleType),
        react: PriceAlertEmail({
          productName,
          productUrl: product.url,
          alertMessage: alert.message,
          currentPrice: formatPrice(
            alert.newValue ? parseFloat(alert.newValue) : product.last_price,
            product.currency
          ),
          stockStatus: product.last_stock_status,
          productDetailUrl,
        }),
      });

      if (error) {
        console.error(`[notifier] Failed to send price alert email: ${error.message}`);
        return false;
      }
    }

    console.log(`[notifier] Email sent to ${userEmail} for ${alert.ruleType} on "${productName}"`);
    return true;
  } catch (err) {
    console.error(`[notifier] Error sending email:`, err);
    return false;
  }
}
