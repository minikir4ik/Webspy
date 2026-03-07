import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const admin = createAdminClient();

  // Check cache (1 hour)
  const { data: cached } = await admin
    .from("ai_insights_cache")
    .select("analysis, generated_at")
    .eq("user_id", user.id)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.generated_at).getTime();
    if (age < 60 * 60 * 1000) {
      return NextResponse.json({
        analysis: cached.analysis,
        generated_at: cached.generated_at,
        from_cache: true,
      });
    }
  }

  // Gather data
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: products }, { data: recentChecks }, { data: alertHistory }] = await Promise.all([
    supabase.from("tracked_products").select("*").eq("user_id", user.id),
    supabase
      .from("price_checks")
      .select("*, tracked_products!inner(user_id, product_name, my_price, is_own_product, currency)")
      .eq("tracked_products.user_id", user.id)
      .gte("checked_at", sevenDaysAgo)
      .order("checked_at", { ascending: false }),
    supabase
      .from("alert_history")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!products || products.length === 0) {
    return NextResponse.json({
      analysis: "No products tracked yet. Add some products to get AI-powered competitive insights.",
      generated_at: new Date().toISOString(),
      from_cache: false,
    });
  }

  // Build context for Claude
  const productSummaries = products.map((p: Record<string, unknown>) => ({
    name: p.product_name || "Unknown",
    price: p.last_price,
    my_price: p.my_price,
    is_own: p.is_own_product,
    stock: p.last_stock_status,
    platform: p.platform,
  }));

  // Find price changes
  const priceChangesByProduct: Record<string, { prices: number[]; name: string }> = {};
  if (recentChecks) {
    for (const check of recentChecks as Record<string, unknown>[]) {
      const tp = check.tracked_products as Record<string, unknown>;
      const pid = check.product_id as string;
      if (!priceChangesByProduct[pid]) {
        priceChangesByProduct[pid] = { prices: [], name: (tp.product_name as string) || "Unknown" };
      }
      if (check.price !== null) {
        priceChangesByProduct[pid].prices.push(check.price as number);
      }
    }
  }

  const priceChanges = Object.entries(priceChangesByProduct)
    .filter(([, v]) => v.prices.length >= 2)
    .map(([, v]) => ({
      name: v.name,
      from: v.prices[v.prices.length - 1],
      to: v.prices[0],
      change: ((v.prices[0] - v.prices[v.prices.length - 1]) / v.prices[v.prices.length - 1] * 100).toFixed(1) + "%",
    }));

  const dataContext = JSON.stringify({
    total_products: products.length,
    products: productSummaries,
    price_changes_7d: priceChanges,
    alerts_triggered_7d: (alertHistory || []).length,
    recent_alerts: (alertHistory || []).slice(0, 10).map((a: Record<string, unknown>) => a.message),
  }, null, 2);

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are a competitive intelligence analyst for an e-commerce seller. Analyze this competitor data and provide:
1. Executive Summary (2-3 sentences on the competitive landscape)
2. Key Threats (competitors who dropped prices, restocked, or are undercutting)
3. Opportunities (competitors who went out of stock, raised prices, or where the user has a price advantage)
4. Recommended Actions (specific, actionable steps the seller should take)
5. Market Trend (is the market trending cheaper or more expensive?)
Format in clear sections with specific numbers and product names. Be concise and actionable. Use markdown formatting.`,
      messages: [
        {
          role: "user",
          content: `Here is my competitive intelligence data:\n\n${dataContext}`,
        },
      ],
    });

    const analysis = response.content[0].type === "text" ? response.content[0].text : "";

    // Cache the result (upsert)
    await admin
      .from("ai_insights_cache")
      .upsert({
        user_id: user.id,
        analysis,
        generated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    return NextResponse.json({
      analysis,
      generated_at: new Date().toISOString(),
      from_cache: false,
    });
  } catch (err) {
    console.error("[insights] AI error:", err);
    return NextResponse.json(
      { error: "Failed to generate analysis" },
      { status: 500 }
    );
  }
}
