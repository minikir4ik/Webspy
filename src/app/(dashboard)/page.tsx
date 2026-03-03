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
import type { AlertHistory, TrackedProduct, PriceCheck } from "@/lib/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch summary stats in parallel
  const [
    { count: productCount },
    { count: alertCount },
    { data: recentAlerts },
    { data: allProducts },
  ] = await Promise.all([
    supabase
      .from("tracked_products")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("alert_rules")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("alert_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("tracked_products")
      .select("*")
      .eq("user_id", user.id),
  ]);

  const products = (allProducts as TrackedProduct[] | null) ?? [];
  const alerts = (recentAlerts as AlertHistory[] | null) ?? [];

  // Get today's date range
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  // Count price and stock changes today
  const { count: priceChangesToday } = await supabase
    .from("alert_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayIso);

  // Get products with biggest price changes in last 24h
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const productIds = products.map((p) => p.id);

  let biggestChanges: {
    product: TrackedProduct;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
  }[] = [];

  if (productIds.length > 0) {
    const { data: recentChecks } = await supabase
      .from("price_checks")
      .select("*")
      .in("product_id", productIds)
      .gte("checked_at", yesterday)
      .order("checked_at", { ascending: false });

    if (recentChecks) {
      // Group checks by product, find biggest change
      const checksByProduct = new Map<string, PriceCheck[]>();
      for (const check of recentChecks as PriceCheck[]) {
        if (!checksByProduct.has(check.product_id)) {
          checksByProduct.set(check.product_id, []);
        }
        checksByProduct.get(check.product_id)!.push(check);
      }

      for (const [pid, checks] of checksByProduct) {
        if (checks.length < 2) continue;
        const newest = checks[0];
        const oldest = checks[checks.length - 1];
        if (
          newest.price === null ||
          oldest.price === null ||
          oldest.price === 0
        )
          continue;
        const changePercent =
          ((newest.price - oldest.price) / oldest.price) * 100;
        if (Math.abs(changePercent) < 0.01) continue;
        const product = products.find((p) => p.id === pid);
        if (product) {
          biggestChanges.push({
            product,
            oldPrice: oldest.price,
            newPrice: newest.price,
            changePercent,
          });
        }
      }

      biggestChanges.sort(
        (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
      );
      biggestChanges = biggestChanges.slice(0, 5);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your competitor monitoring activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tracked Products
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Alert rules configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Changes Today
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{priceChangesToday ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Alerts triggered today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <FetchProjectCount userId={user.id} />
          </CardContent>
        </Card>
      </div>

      {biggestChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Biggest Price Changes (24h)
            </CardTitle>
            <CardDescription>
              Products with the largest price movements in the last 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {biggestChanges.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {item.product.product_name || "Unnamed Product"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.oldPrice, item.product.currency)} →{" "}
                        {formatPrice(item.newPrice, item.product.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.changePercent < 0 ? (
                      <ArrowDown className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowUp className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        item.changePercent < 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {item.changePercent > 0 ? "+" : ""}
                      {item.changePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>
            Latest alerts triggered across all your projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
              <p className="text-sm text-muted-foreground">
                No recent activity. Alerts will appear here when triggered.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{alert.message}</p>
                      {alert.channels_sent && alert.channels_sent.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {alert.channels_sent.map((ch) => (
                            <Badge
                              key={ch}
                              variant="secondary"
                              className="text-xs"
                            >
                              {ch}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relativeTime(alert.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function FetchProjectCount({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return (
    <>
      <div className="text-2xl font-bold">{count ?? 0}</div>
      <p className="text-xs text-muted-foreground">Active projects</p>
    </>
  );
}
