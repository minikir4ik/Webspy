import { createAdminClient } from "@/lib/supabase/admin";
import type { TrackedProduct, PriceCheck, AlertRule } from "@/lib/types/database";

interface TriggeredAlert {
  ruleId: string;
  ruleType: string;
  message: string;
  oldValue: string | null;
  newValue: string | null;
}

export async function evaluateAlerts(
  product: TrackedProduct,
  newCheck: PriceCheck,
  previousCheck: PriceCheck | null
): Promise<TriggeredAlert[]> {
  const admin = createAdminClient();

  // Load active alert rules for this product
  const { data: rules } = await admin
    .from("alert_rules")
    .select("*")
    .eq("product_id", product.id)
    .eq("is_active", true);

  if (!rules || rules.length === 0) return [];

  const triggered: TriggeredAlert[] = [];
  const now = new Date();

  for (const rule of rules as AlertRule[]) {
    // Check cooldown
    if (rule.last_triggered_at) {
      const lastTriggered = new Date(rule.last_triggered_at);
      const cooldownMs = rule.cooldown_minutes * 60 * 1000;
      if (now.getTime() - lastTriggered.getTime() < cooldownMs) {
        continue;
      }
    }

    const alert = evaluateRule(rule, product, newCheck, previousCheck);
    if (!alert) continue;

    // Update last_triggered_at
    await admin
      .from("alert_rules")
      .update({ last_triggered_at: now.toISOString() })
      .eq("id", rule.id);

    // Insert alert history
    await admin.from("alert_history").insert({
      rule_id: rule.id,
      product_id: product.id,
      user_id: product.user_id,
      message: alert.message,
      old_value: alert.oldValue,
      new_value: alert.newValue,
      channels_sent: rule.notify_channels,
    });

    triggered.push({
      ruleId: rule.id,
      ruleType: rule.rule_type,
      ...alert,
    });
  }

  return triggered;
}

function evaluateRule(
  rule: AlertRule,
  product: TrackedProduct,
  newCheck: PriceCheck,
  prevCheck: PriceCheck | null
): { message: string; oldValue: string | null; newValue: string | null } | null {
  const newPrice = newCheck.price;
  const oldPrice = prevCheck?.price ?? null;
  const productName = product.product_name || "Product";

  switch (rule.rule_type) {
    case "price_drop_percent": {
      if (newPrice === null || oldPrice === null || oldPrice <= 0) return null;
      const dropPercent = ((oldPrice - newPrice) / oldPrice) * 100;
      if (rule.threshold !== null && dropPercent >= rule.threshold) {
        return {
          message: `${productName} price dropped ${dropPercent.toFixed(1)}% (from $${oldPrice} to $${newPrice})`,
          oldValue: String(oldPrice),
          newValue: String(newPrice),
        };
      }
      return null;
    }

    case "price_drop_absolute": {
      if (newPrice === null || oldPrice === null) return null;
      const drop = oldPrice - newPrice;
      if (rule.threshold !== null && drop >= rule.threshold) {
        return {
          message: `${productName} price dropped by $${drop.toFixed(2)} (from $${oldPrice} to $${newPrice})`,
          oldValue: String(oldPrice),
          newValue: String(newPrice),
        };
      }
      return null;
    }

    case "price_below": {
      if (newPrice === null || rule.threshold === null) return null;
      if (newPrice <= rule.threshold) {
        return {
          message: `${productName} price is now $${newPrice}, below your threshold of $${rule.threshold}`,
          oldValue: oldPrice !== null ? String(oldPrice) : null,
          newValue: String(newPrice),
        };
      }
      return null;
    }

    case "price_above": {
      if (newPrice === null || rule.threshold === null) return null;
      if (newPrice >= rule.threshold) {
        return {
          message: `${productName} price is now $${newPrice}, above your threshold of $${rule.threshold}`,
          oldValue: oldPrice !== null ? String(oldPrice) : null,
          newValue: String(newPrice),
        };
      }
      return null;
    }

    case "price_increases": {
      if (newPrice === null || oldPrice === null || oldPrice <= 0) return null;
      const increasePercent = ((newPrice - oldPrice) / oldPrice) * 100;
      if (rule.threshold !== null && increasePercent >= rule.threshold) {
        return {
          message: `${productName} price increased ${increasePercent.toFixed(1)}% (from $${oldPrice} to $${newPrice})`,
          oldValue: String(oldPrice),
          newValue: String(newPrice),
        };
      }
      return null;
    }

    case "stock_change": {
      const oldStatus = prevCheck?.stock_status ?? null;
      const newStatus = newCheck.stock_status ?? null;
      if (oldStatus === null || newStatus === null) return null;
      if (oldStatus !== newStatus) {
        return {
          message: `${productName} stock status changed from "${oldStatus}" to "${newStatus}"`,
          oldValue: oldStatus,
          newValue: newStatus,
        };
      }
      return null;
    }

    case "competitor_undercuts_me": {
      if (newPrice === null || product.my_price === null) return null;
      if (newPrice < product.my_price) {
        return {
          message: `${productName} is now $${newPrice}, undercutting your price of $${product.my_price}`,
          oldValue: String(product.my_price),
          newValue: String(newPrice),
        };
      }
      return null;
    }

    default:
      return null;
  }
}
