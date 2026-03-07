import { createClient } from "@/lib/supabase/server";
import { formatPrice, relativeTime } from "@/lib/utils/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban,
  Bell,
  TrendingDown,
  Eye,
  ArrowDown,
  ArrowUp,
  Package,
} from "lucide-react";
import { PricePositionWidget } from "@/components/dashboard/price-position-widget";
import type { AlertHistory, TrackedProduct, PriceCheck } from "@/lib/types/database";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [
    { count: productCount },
    { count: alertCount },
    { count: projectCount },
    { data: recentAlerts },
    { data: allProducts },
  ] = await Promise.all([
    supabase.from("tracked_products").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("alert_rules").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true),
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("alert_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("tracked_products").select("*").eq("user_id", user.id),
  ]);

  const products = (allProducts as TrackedProduct[] | null) ?? [];
  const alerts = (recentAlerts as AlertHistory[] | null) ?? [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: changesToday } = await supabase
    .from("alert_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayStart.toISOString());

  // Biggest price changes in 24h
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const productIds = products.map((p) => p.id);
  let biggestChanges: { product: TrackedProduct; oldPrice: number; newPrice: number; changePercent: number }[] = [];

  if (productIds.length > 0) {
    const { data: recentChecks } = await supabase
      .from("price_checks")
      .select("*")
      .in("product_id", productIds)
      .gte("checked_at", yesterday)
      .order("checked_at", { ascending: false });

    if (recentChecks) {
      const checksByProduct = new Map<string, PriceCheck[]>();
      for (const check of recentChecks as PriceCheck[]) {
        if (!checksByProduct.has(check.product_id)) checksByProduct.set(check.product_id, []);
        checksByProduct.get(check.product_id)!.push(check);
      }
      for (const [pid, checks] of checksByProduct) {
        if (checks.length < 2) continue;
        const newest = checks[0];
        const oldest = checks[checks.length - 1];
        if (newest.price === null || oldest.price === null || oldest.price === 0) continue;
        const changePercent = ((newest.price - oldest.price) / oldest.price) * 100;
        if (Math.abs(changePercent) < 0.01) continue;
        const product = products.find((p) => p.id === pid);
        if (product) biggestChanges.push({ product, oldPrice: oldest.price, newPrice: newest.price, changePercent });
      }
      biggestChanges.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      biggestChanges = biggestChanges.slice(0, 5);
    }
  }

  const stats = [
    { label: "Tracked Products", value: productCount ?? 0, icon: Eye, color: "bg-indigo-50 text-indigo-600", border: "border-l-indigo-500" },
    { label: "Active Alerts", value: alertCount ?? 0, icon: Bell, color: "bg-emerald-50 text-emerald-600", border: "border-l-emerald-500" },
    { label: "Changes Today", value: changesToday ?? 0, icon: TrendingDown, color: "bg-amber-50 text-amber-600", border: "border-l-amber-500" },
    { label: "Projects", value: projectCount ?? 0, icon: FolderKanban, color: "bg-purple-50 text-purple-600", border: "border-l-purple-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {getGreeting()}, {user.email?.split("@")[0]}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Here&apos;s what&apos;s happening with your tracked products.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className={`border-l-4 ${stat.border} shadow-sm`}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PricePositionWidget products={products} />

      {biggestChanges.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Biggest Price Changes (24h)</CardTitle>
            <CardDescription>Products with the largest price movements.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {biggestChanges.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <Package className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {item.product.product_name || "Unnamed Product"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatPrice(item.oldPrice, item.product.currency)} → {formatPrice(item.newPrice, item.product.currency)}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.changePercent < 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}>
                    {item.changePercent < 0 ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUp className="h-3 w-3" />
                    )}
                    {Math.abs(item.changePercent).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Recent Activity</CardTitle>
          <CardDescription>Latest alerts triggered across your projects.</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200">
              <p className="text-sm text-slate-400">No recent activity. Alerts will appear here when triggered.</p>
            </div>
          ) : (
            <div className="relative ml-3">
              {/* Timeline line */}
              <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="relative flex gap-4 pl-6">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1 -translate-x-1/2 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">{alert.message}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-slate-400">{relativeTime(alert.created_at)}</span>
                        {alert.channels_sent?.map((ch) => (
                          <Badge key={ch} variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 text-slate-500">
                            {ch}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
