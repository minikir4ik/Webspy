import { createAdminClient } from "@/lib/supabase/admin";
import { sendAlertNotification } from "@/lib/alerts/notifier";
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

  console.log(`[alerts] Evaluating alerts for product "${product.product_name}" (${product.id})`);
  console.log(`[alerts] newCheck.price=${newCheck.price}, product.my_price=${product.my_price}`);
  console.log(`[alerts] previousCheck.price=${previousCheck?.price ?? "null (no previous check)"}`);

  // Load active alert rules for this product
  const { data: rules, error: rulesError } = await admin
    .from("alert_rules")
    .select("*")
    .eq("product_id", product.id)
    .eq("is_active", true);

  if (rulesError) {
    console.error("[alerts] Error loading rules:", rulesError.message);
    return [];
  }

  if (!rules || rules.length === 0) {
    console.log("[alerts] No active rules found for this product");
    return [];
  }

  console.log(`[alerts] Found ${rules.length} active rule(s): ${(rules as AlertRule[]).map(r => r.rule_type).join(", ")}`);

  // Fetch user email + notification preferences
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email")
    .eq("id", product.user_id)
    .single();

  console.log(`[alerts] Profile query for user ${product.user_id}:`, { profile, profileError: profileError?.message });

  const userEmail = (profile as { email: string | null } | null)?.email ?? null;

  // email_notifications column may not exist yet (migration 002), so query it separately
  let emailEnabled = true;
  try {
    const { data: prefs } = await admin
      .from("profiles")
      .select("email_notifications")
      .eq("id", product.user_id)
      .single();
    if (prefs && (prefs as { email_notifications?: boolean }).email_notifications === false) {
      emailEnabled = false;
    }
  } catch {
    // Column doesn't exist yet, default to true
  }

  console.log(`[alerts] User email: "${userEmail}", emailEnabled: ${emailEnabled}`);

  const triggered: TriggeredAlert[] = [];
  const now = new Date();

  for (const rule of rules as AlertRule[]) {
    console.log(`[alerts] Evaluating rule: ${rule.rule_type} (id=${rule.id})`);

    // Check cooldown
    if (rule.last_triggered_at) {
      const lastTriggered = new Date(rule.last_triggered_at);
      const cooldownMs = rule.cooldown_minutes * 60 * 1000;
      const elapsed = now.getTime() - lastTriggered.getTime();
      if (elapsed < cooldownMs) {
        console.log(`[alerts] Rule ${rule.rule_type} skipped: cooldown active (${Math.round(elapsed / 60000)}min < ${rule.cooldown_minutes}min)`);
        continue;
      }
    }

    const alert = evaluateRule(rule, product, newCheck, previousCheck);

    if (!alert) {
      console.log(`[alerts] Rule ${rule.rule_type} did NOT trigger`);
      continue;
    }

    console.log(`[alerts] Rule ${rule.rule_type} TRIGGERED: ${alert.message}`);

    // Update last_triggered_at
    await admin
      .from("alert_rules")
      .update({ last_triggered_at: now.toISOString() })
      .eq("id", rule.id);

    // Determine channels sent
    const channelsSent: string[] = [];

    // Send email notification if enabled
    if (userEmail && emailEnabled) {
      console.log(`[alerts] About to call sendAlertNotification for ${rule.rule_type} to ${userEmail}`);
      const triggeredAlertData = {
        ruleId: rule.id,
        ruleType: rule.rule_type,
        ...alert,
      };
      const sent = await sendAlertNotification(triggeredAlertData, product, userEmail);
      console.log(`[alerts] sendAlertNotification returned: ${sent}`);
      if (sent) channelsSent.push("email");
    } else {
      console.log(`[alerts] SKIPPING email: userEmail="${userEmail}", emailEnabled=${emailEnabled}`);
    }

    // Insert alert history
    const { error: insertError } = await admin.from("alert_history").insert({
      rule_id: rule.id,
      product_id: product.id,
      user_id: product.user_id,
      message: alert.message,
      old_value: alert.oldValue,
      new_value: alert.newValue,
      channels_sent: channelsSent.length > 0 ? channelsSent : rule.notify_channels,
    });

    if (insertError) {
      console.error(`[alerts] Failed to insert alert_history: ${insertError.message}`);
    } else {
      console.log(`[alerts] Inserted alert_history row for rule ${rule.rule_type} (channels: ${channelsSent.join(", ") || "none"})`);
    }

    triggered.push({
      ruleId: rule.id,
      ruleType: rule.rule_type,
      ...alert,
    });
  }

  console.log(`[alerts] Evaluation complete. ${triggered.length} alert(s) triggered.`);
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
      console.log(`[alerts] competitor_undercuts_me: newPrice=${newPrice}, my_price=${product.my_price}`);
      if (newPrice === null) {
        console.log("[alerts] competitor_undercuts_me: skipped — newPrice is null");
        return null;
      }
      if (product.my_price === null) {
        console.log("[alerts] competitor_undercuts_me: skipped — my_price is null");
        return null;
      }
      if (newPrice < product.my_price) {
        console.log(`[alerts] competitor_undercuts_me: TRIGGERED — $${newPrice} < $${product.my_price}`);
        return {
          message: `${productName} is now $${newPrice}, undercutting your price of $${product.my_price}`,
          oldValue: String(product.my_price),
          newValue: String(newPrice),
        };
      }
      console.log(`[alerts] competitor_undercuts_me: not triggered — $${newPrice} >= $${product.my_price}`);
      return null;
    }

    default:
      return null;
  }
}
