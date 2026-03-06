import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateAlerts } from "@/lib/alerts/evaluator";
import { sendAlertNotification } from "@/lib/alerts/notifier";
import type { TrackedProduct, PriceCheck } from "@/lib/types/database";

const TEST_EMAIL = "rodionovk20189@gmail.com";

export async function GET() {
  const admin = createAdminClient();

  // 1. Reset all alert_rules cooldowns
  const { data: resetData, error: resetError } = await admin
    .from("alert_rules")
    .update({ last_triggered_at: null })
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select("id, rule_type");

  console.log("[test-email] Reset cooldowns:", resetData?.length ?? 0, "rules", resetError?.message ?? "OK");

  // 2. Find a product — try Kylie first, then any with my_price, then just the first one
  let p: TrackedProduct | null = null;

  const { data: kylie } = await admin
    .from("tracked_products")
    .select("*")
    .ilike("product_name", "%kylie%")
    .limit(1)
    .single();

  if (kylie) {
    p = kylie as TrackedProduct;
  } else {
    const { data: withPrice } = await admin
      .from("tracked_products")
      .select("*")
      .not("my_price", "is", null)
      .limit(1)
      .single();

    if (withPrice) {
      p = withPrice as TrackedProduct;
    } else {
      const { data: any } = await admin
        .from("tracked_products")
        .select("*")
        .limit(1)
        .single();
      if (any) p = any as TrackedProduct;
    }
  }

  if (!p) {
    return NextResponse.json({ error: "No tracked products found" });
  }

  console.log(`[test-email] Product: "${p.product_name}" (${p.id}), my_price=${p.my_price}, last_price=${p.last_price}`);

  // 3. Fetch latest 2 price checks
  const { data: checks } = await admin
    .from("price_checks")
    .select("*")
    .eq("product_id", p.id)
    .order("checked_at", { ascending: false })
    .limit(2);

  const latestCheck = (checks as PriceCheck[] | null)?.[0] ?? null;
  const previousCheck = (checks as PriceCheck[] | null)?.[1] ?? null;

  console.log(`[test-email] Latest check: price=${latestCheck?.price}, at=${latestCheck?.checked_at}`);
  console.log(`[test-email] Previous check: price=${previousCheck?.price ?? "none"}`);

  if (!latestCheck) {
    return NextResponse.json({ error: "No price checks found" });
  }

  // 4. Fetch alert rules
  const { data: rules } = await admin
    .from("alert_rules")
    .select("id, rule_type, is_active, threshold, last_triggered_at")
    .eq("product_id", p.id);

  console.log(`[test-email] Alert rules:`, rules);

  // 5. Run evaluateAlerts (this internally tries to send email via notifier)
  console.log("[test-email] >>> Running evaluateAlerts...");
  let triggered;
  try {
    triggered = await evaluateAlerts(p, latestCheck, previousCheck);
    console.log("[test-email] <<< evaluateAlerts returned:", JSON.stringify(triggered));
  } catch (err) {
    console.error("[test-email] evaluateAlerts threw:", err);
    return NextResponse.json({ error: "evaluateAlerts threw", detail: String(err) }, { status: 500 });
  }

  // 6. EXPLICIT fallback: if evaluateAlerts triggered alerts, also try sending directly
  const directSendResults: { ruleType: string; success: boolean; error?: string }[] = [];

  if (triggered.length > 0) {
    console.log(`[test-email] === DIRECT SEND TEST: ${triggered.length} alert(s) ===`);
    for (const alert of triggered) {
      console.log(`[test-email] Direct sending ${alert.ruleType} to ${TEST_EMAIL}...`);
      try {
        const sent = await sendAlertNotification(alert, p, TEST_EMAIL);
        console.log(`[test-email] Direct send result: ${sent}`);
        directSendResults.push({ ruleType: alert.ruleType, success: sent });
      } catch (err) {
        console.error(`[test-email] Direct send threw:`, err);
        directSendResults.push({ ruleType: alert.ruleType, success: false, error: String(err) });
      }
    }
  } else {
    console.log("[test-email] No alerts triggered — nothing to send");
  }

  return NextResponse.json({
    cooldownsReset: resetData?.length ?? 0,
    product: { id: p.id, name: p.product_name, my_price: p.my_price, last_price: p.last_price },
    alertRules: rules,
    latestCheck: { price: latestCheck.price, stock_status: latestCheck.stock_status, checked_at: latestCheck.checked_at },
    previousCheck: previousCheck ? { price: previousCheck.price, checked_at: previousCheck.checked_at } : null,
    triggeredAlerts: triggered,
    directSendResults,
  });
}
