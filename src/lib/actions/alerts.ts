"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AlertRuleType } from "@/lib/types/database";

const VALID_RULE_TYPES: AlertRuleType[] = [
  "price_drop_percent",
  "price_drop_absolute",
  "price_below",
  "price_above",
  "price_increases",
  "stock_change",
  "competitor_undercuts_me",
];

const VALID_COOLDOWNS = [60, 360, 720, 1440];

export async function createAlertRule(formData: FormData) {
  const productId = formData.get("product_id") as string;
  const ruleType = formData.get("rule_type") as AlertRuleType;
  const thresholdStr = formData.get("threshold") as string;
  const cooldownStr = formData.get("cooldown_minutes") as string;

  if (!productId) return { error: "Product ID is required" };
  if (!ruleType || !VALID_RULE_TYPES.includes(ruleType)) {
    return { error: "Invalid rule type" };
  }

  const needsThreshold = ruleType !== "stock_change" && ruleType !== "competitor_undercuts_me";
  const threshold = thresholdStr ? parseFloat(thresholdStr) : null;

  if (needsThreshold && (threshold === null || isNaN(threshold) || threshold <= 0)) {
    return { error: "Threshold must be a positive number" };
  }

  const cooldownMinutes = cooldownStr ? parseInt(cooldownStr, 10) : 360;
  if (!VALID_COOLDOWNS.includes(cooldownMinutes)) {
    return { error: "Invalid cooldown value" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("alert_rules")
    .insert({
      user_id: user.id,
      product_id: productId,
      rule_type: ruleType,
      threshold: needsThreshold ? threshold : null,
      cooldown_minutes: cooldownMinutes,
      is_active: true,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/projects`);
  return { data };
}

export async function toggleAlertRule(ruleId: string, isActive: boolean) {
  if (!ruleId) return { error: "Rule ID is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("alert_rules")
    .update({ is_active: isActive })
    .eq("id", ruleId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects`);
  return { success: true };
}

export async function deleteAlertRule(ruleId: string) {
  if (!ruleId) return { error: "Rule ID is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("alert_rules")
    .delete()
    .eq("id", ruleId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects`);
  return { success: true };
}
