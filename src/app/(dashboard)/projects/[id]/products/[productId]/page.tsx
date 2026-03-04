import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice, relativeTime } from "@/lib/utils/format";
import { AutoScrape } from "@/components/products/auto-scrape";
import { PriceHistoryChart } from "@/components/products/price-history-chart";
import { RecentChecksTable } from "@/components/products/recent-checks-table";
import { AlertRulesSection } from "@/components/products/alert-rules-section";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ExternalLink,
  DollarSign,
  Clock,
  Tag,
  Calendar,
} from "lucide-react";
import type { TrackedProduct, Platform, StockStatus, PriceCheck, AlertRule } from "@/lib/types/database";

const platformConfig: Record<Platform, { label: string; className: string }> = {
  shopify: { label: "Shopify", className: "bg-emerald-50 text-emerald-700 border-0" },
  amazon: { label: "Amazon", className: "bg-orange-50 text-orange-700 border-0" },
  walmart: { label: "Walmart", className: "bg-blue-50 text-blue-700 border-0" },
  generic: { label: "Generic", className: "bg-slate-50 text-slate-600 border-0" },
};

const stockConfig: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: "In Stock", className: "bg-emerald-50 text-emerald-700 border-0" },
  out_of_stock: { label: "Out of Stock", className: "bg-rose-50 text-rose-700 border-0" },
  limited: { label: "Limited Stock", className: "bg-amber-50 text-amber-700 border-0" },
  unknown: { label: "Unknown", className: "bg-slate-50 text-slate-600 border-0" },
};

const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  active: { color: "text-emerald-600", bgColor: "bg-emerald-500", label: "Active" },
  paused: { color: "text-amber-600", bgColor: "bg-amber-500", label: "Paused" },
  broken: { color: "text-rose-600", bgColor: "bg-rose-500", label: "Broken" },
  pending: { color: "text-blue-600", bgColor: "bg-blue-500", label: "Pending" },
};

interface ProductDetailPageProps {
  params: Promise<{ id: string; productId: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id, productId } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: projectData }] = await Promise.all([
    supabase
      .from("tracked_products")
      .select("*")
      .eq("id", productId)
      .eq("project_id", id)
      .single(),
    supabase
      .from("projects")
      .select("name")
      .eq("id", id)
      .single(),
  ]);

  if (!product) {
    notFound();
  }

  const p = product as TrackedProduct;
  const projectName = (projectData as { name: string } | null)?.name ?? "Project";
  const platform = platformConfig[p.platform];
  const stock = p.last_stock_status ? stockConfig[p.last_stock_status] : null;
  const status = statusConfig[p.status] || statusConfig.pending;

  // Fetch price history
  const { data: priceChecks } = await supabase
    .from("price_checks")
    .select("*")
    .eq("product_id", productId)
    .order("checked_at", { ascending: true });

  const checks = (priceChecks as PriceCheck[] | null) ?? [];

  // Fetch recent checks (last 20, descending)
  const recentChecks = [...checks].reverse().slice(0, 20);

  // Fetch alert rules
  const { data: alertRules } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  const rules = (alertRules as AlertRule[] | null) ?? [];

  const infoCards = [
    {
      label: "Current Price",
      value: formatPrice(p.last_price, p.currency),
      icon: DollarSign,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "My Price",
      value: formatPrice(p.my_price, p.currency),
      icon: Tag,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Last Checked",
      value: relativeTime(p.last_check_at),
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Created",
      value: formatDate(p.created_at),
      icon: Calendar,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-8">
      <AutoScrape productId={productId} lastCheckAt={p.last_check_at} />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/projects" className="text-slate-500 hover:text-slate-900 transition-colors">
          Projects
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <Link href={`/projects/${id}`} className="text-slate-500 hover:text-slate-900 transition-colors">
          {projectName}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-medium text-slate-900">
          {p.product_name || "Product"}
        </span>
      </nav>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {p.product_name || "Unnamed Product"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={platform.className}>
              {platform.label}
            </Badge>
            {stock && (
              <Badge variant="secondary" className={stock.className}>
                {stock.label}
              </Badge>
            )}
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${status.bgColor}`} />
              <span className="text-sm text-slate-500">{status.label}</span>
            </div>
          </div>
        </div>
        <a href={p.url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="shadow-sm">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Visit URL
          </Button>
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {infoCards.map((card) => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PriceHistoryChart checks={checks} currency={p.currency} />

      <RecentChecksTable checks={recentChecks} currency={p.currency} />

      <AlertRulesSection
        productId={productId}
        rules={rules}
        myPrice={p.my_price}
      />
    </div>
  );
}
