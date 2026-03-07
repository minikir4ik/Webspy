"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Trash2,
  Pause,
  Play,
  ExternalLink,
  Circle,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { deleteProduct, updateProduct } from "@/lib/actions/products";
import { relativeTime, formatPrice, getDomainFromUrl } from "@/lib/utils/format";
import type { TrackedProduct, Platform, StockStatus } from "@/lib/types/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const platformConfig: Record<Platform, { label: string; className: string }> = {
  shopify: { label: "Shopify", className: "bg-emerald-50 text-emerald-700 border-0" },
  amazon: { label: "Amazon", className: "bg-orange-50 text-orange-700 border-0" },
  walmart: { label: "Walmart", className: "bg-blue-50 text-blue-700 border-0" },
  generic: { label: "Generic", className: "bg-slate-50 text-slate-600 border-0" },
};

const stockConfig: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: "In Stock", className: "bg-emerald-50 text-emerald-700 border-0" },
  out_of_stock: { label: "Out of Stock", className: "bg-rose-50 text-rose-700 border-0" },
  limited: { label: "Limited", className: "bg-amber-50 text-amber-700 border-0" },
  unknown: { label: "Unknown", className: "bg-slate-50 text-slate-600 border-0" },
};

const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  active: { color: "text-emerald-500", bgColor: "bg-emerald-500", label: "Active" },
  paused: { color: "text-amber-500", bgColor: "bg-amber-500", label: "Paused" },
  broken: { color: "text-rose-500", bgColor: "bg-rose-500", label: "Broken" },
  pending: { color: "text-blue-500", bgColor: "bg-blue-500", label: "Pending" },
};

interface ProductCardProps {
  product: TrackedProduct;
  projectId: string;
}

export function ProductCard({ product, projectId }: ProductCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const router = useRouter();

  const displayName = product.product_name || getDomainFromUrl(product.url);
  const platform = platformConfig[product.platform];
  const stock = product.last_stock_status
    ? stockConfig[product.last_stock_status]
    : null;
  const status = statusConfig[product.status] || statusConfig.pending;

  async function handleDelete() {
    setDeleting(true);
    await deleteProduct(product.id);
    setConfirmDelete(false);
    setDeleting(false);
    router.refresh();
  }

  async function handleTogglePause() {
    setToggling(true);
    await updateProduct(product.id, {
      status: product.status === "paused" ? "active" : "paused",
    });
    setToggling(false);
    router.refresh();
  }

  return (
    <>
      <Card
        className={`group cursor-pointer shadow-sm transition-lift hover:shadow-md ${
          product.is_own_product ? "border-blue-300 ring-1 ring-blue-100" : ""
        }`}
        onClick={() =>
          router.push(`/projects/${projectId}/products/${product.id}`)
        }
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`h-2 w-2 rounded-full ${status.bgColor}`} />
              <CardTitle className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className={platform.className + " text-[11px] h-5 px-1.5"}>
                {platform.label}
              </Badge>
              {product.is_own_product && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0 text-[11px] h-5 px-1.5">
                  Your Product
                </Badge>
              )}
              {stock && (
                <Badge variant="secondary" className={stock.className + " text-[11px] h-5 px-1.5"}>
                  {stock.label}
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePause();
                }}
                disabled={toggling}
              >
                {product.status === "paused" ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(product.url, "_blank");
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open URL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Price</span>
              <span className="text-lg font-bold text-slate-900">
                {product.last_price !== null
                  ? formatPrice(product.last_price, product.currency)
                  : "—"}
              </span>
            </div>
            {product.my_price !== null && product.last_price !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">vs My Price</span>
                <div className="flex items-center gap-1">
                  {product.last_price < product.my_price ? (
                    <>
                      <ArrowDown className="h-3 w-3 text-rose-500" />
                      <span className="text-xs font-medium text-rose-600">
                        {formatPrice(product.my_price - product.last_price, product.currency)} cheaper
                      </span>
                    </>
                  ) : product.last_price > product.my_price ? (
                    <>
                      <ArrowUp className="h-3 w-3 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600">
                        {formatPrice(product.last_price - product.my_price, product.currency)} higher
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">Same price</span>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                {relativeTime(product.last_check_at)}
              </span>
              <span className="text-[11px] text-slate-400">{status.label}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{displayName}&quot;? This
              will also delete all price history for this product. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
