import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice, relativeTime } from "@/lib/utils/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ExternalLink,
  LineChart,
  Bell,
  Circle,
} from "lucide-react";
import type { TrackedProduct, Platform, StockStatus } from "@/lib/types/database";

const platformConfig: Record<Platform, { label: string; className: string }> = {
  shopify: { label: "Shopify", className: "bg-green-100 text-green-800" },
  amazon: { label: "Amazon", className: "bg-orange-100 text-orange-800" },
  walmart: { label: "Walmart", className: "bg-blue-100 text-blue-800" },
  generic: { label: "Generic", className: "bg-gray-100 text-gray-800" },
};

const stockConfig: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: "In Stock", className: "bg-green-100 text-green-800" },
  out_of_stock: {
    label: "Out of Stock",
    className: "bg-red-100 text-red-800",
  },
  limited: {
    label: "Limited Stock",
    className: "bg-yellow-100 text-yellow-800",
  },
  unknown: { label: "Unknown", className: "bg-gray-100 text-gray-800" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: "text-green-500", label: "Active" },
  paused: { color: "text-yellow-500", label: "Paused" },
  broken: { color: "text-red-500", label: "Broken" },
  pending: { color: "text-blue-500", label: "Pending" },
};

interface ProductDetailPageProps {
  params: Promise<{ id: string; productId: string }>;
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id, productId } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("tracked_products")
    .select("*")
    .eq("id", productId)
    .eq("project_id", id)
    .single();

  if (!product) {
    notFound();
  }

  const p = product as TrackedProduct;
  const platform = platformConfig[p.platform];
  const stock = p.last_stock_status ? stockConfig[p.last_stock_status] : null;
  const status = statusConfig[p.status] || statusConfig.pending;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Project
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
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
                <Circle
                  className={`h-2.5 w-2.5 fill-current ${status.color}`}
                />
                <span className="text-sm text-muted-foreground">
                  {status.label}
                </span>
              </div>
            </div>
          </div>
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1 h-4 w-4" />
              Visit URL
            </Button>
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(p.last_price, p.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              My Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(p.my_price, p.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Checked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {relativeTime(p.last_check_at)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(p.created_at)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Product URL</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline-offset-4 hover:underline break-all"
          >
            {p.url}
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LineChart className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Price History</CardTitle>
          </div>
          <CardDescription>
            Price trends over time will appear here once checks begin running.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              No price history yet. Data will appear after the first check.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Alert Rules</CardTitle>
          </div>
          <CardDescription>
            Configure alerts for price changes and stock updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              Alert rules will be configurable here soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
