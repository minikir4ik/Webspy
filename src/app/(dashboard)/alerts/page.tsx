import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils/format";
import { CreateAlertPageDialog } from "@/components/alerts/create-alert-page-dialog";
import { AlertRuleRow } from "@/components/alerts/alert-rule-row";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, History, Package } from "lucide-react";
import type {
  AlertRule,
  AlertHistory,
  TrackedProduct,
  Project,
} from "@/lib/types/database";

const ruleTypeLabels: Record<string, string> = {
  price_drop_percent: "Price drops by %",
  price_drop_absolute: "Price drops by $",
  price_below: "Price below $",
  price_above: "Price above $",
  price_increases: "Price increases by %",
  stock_change: "Stock status changes",
  competitor_undercuts_me: "Competitor undercuts me",
};

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [
    { data: projects },
    { data: products },
    { data: alertRules },
    { data: alertHistory },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("tracked_products")
      .select("id, project_id, product_name, url, my_price")
      .eq("user_id", user.id)
      .order("product_name"),
    supabase
      .from("alert_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("alert_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const projectList = (projects as Pick<Project, "id" | "name">[] | null) ?? [];
  const productList =
    (products as Pick<TrackedProduct, "id" | "project_id" | "product_name" | "url" | "my_price">[] | null) ?? [];
  const rules = (alertRules as AlertRule[] | null) ?? [];
  const history = (alertHistory as AlertHistory[] | null) ?? [];

  // Group rules by product
  const productMap = new Map(productList.map((p) => [p.id, p]));
  const rulesByProduct = new Map<string, { product: typeof productList[0]; rules: AlertRule[] }>();

  for (const rule of rules) {
    const product = productMap.get(rule.product_id);
    if (!product) continue;
    if (!rulesByProduct.has(rule.product_id)) {
      rulesByProduct.set(rule.product_id, { product, rules: [] });
    }
    rulesByProduct.get(rule.product_id)!.rules.push(rule);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Alerts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure notifications for price changes and stock updates.
          </p>
        </div>
        <CreateAlertPageDialog projects={projectList} products={productList} />
      </div>

      {/* Alert Rules grouped by product */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Alert Rules</h2>
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-12 px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 mb-3">
              <Bell className="h-7 w-7 text-indigo-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              No alert rules yet
            </h3>
            <p className="text-sm text-slate-500 mb-5 text-center max-w-sm">
              Set up alerts to get notified when competitor prices change or products go out of stock.
            </p>
            <CreateAlertPageDialog projects={projectList} products={productList} />
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(rulesByProduct.entries()).map(([productId, { product, rules: productRules }]) => (
              <Card key={productId} className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <Package className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-slate-900">
                        {product.product_name || new URL(product.url).hostname}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="ml-auto bg-indigo-50 text-indigo-700 border-0 text-[11px] h-5 px-1.5">
                      {productRules.length} rule{productRules.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {productRules.map((rule) => (
                      <AlertRuleRow key={rule.id} rule={rule} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Alert History */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Alert History</h2>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            {history.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200">
                <p className="text-sm text-slate-400">
                  No alerts triggered yet. History will appear here when rules fire.
                </p>
              </div>
            ) : (
              <div className="relative ml-3">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
                <div className="space-y-4">
                  {history.map((entry) => {
                    const product = productMap.get(entry.product_id);
                    return (
                      <div key={entry.id} className="relative flex gap-4 pl-6">
                        <div className="absolute left-0 top-1 -translate-x-1/2 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white" />
                        <div className="flex-1 min-w-0">
                          {product && (
                            <p className="text-xs font-medium text-indigo-600 mb-0.5">
                              {product.product_name || new URL(product.url).hostname}
                            </p>
                          )}
                          <p className="text-sm text-slate-700">{entry.message}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {relativeTime(entry.created_at)}
                            </span>
                            {entry.channels_sent?.map((ch) => (
                              <Badge
                                key={ch}
                                variant="secondary"
                                className="text-[10px] h-5 px-1.5 bg-slate-100 text-slate-500"
                              >
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
