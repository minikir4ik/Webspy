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
  shopify: { label: "Shopify", className: "bg-green-100 text-green-800" },
  amazon: { label: "Amazon", className: "bg-orange-100 text-orange-800" },
  walmart: { label: "Walmart", className: "bg-blue-100 text-blue-800" },
  generic: { label: "Generic", className: "bg-gray-100 text-gray-800" },
};

const stockConfig: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: "In Stock", className: "bg-green-100 text-green-800" },
  out_of_stock: { label: "Out of Stock", className: "bg-red-100 text-red-800" },
  limited: { label: "Limited", className: "bg-yellow-100 text-yellow-800" },
  unknown: { label: "Unknown", className: "bg-gray-100 text-gray-800" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: "text-green-500", label: "Active" },
  paused: { color: "text-yellow-500", label: "Paused" },
  broken: { color: "text-red-500", label: "Broken" },
  pending: { color: "text-blue-500", label: "Pending" },
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
        className="cursor-pointer transition-colors hover:bg-muted/50"
        onClick={() =>
          router.push(`/projects/${projectId}/products/${product.id}`)
        }
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="min-w-0 flex-1 pr-2">
            <CardTitle className="truncate text-base">{displayName}</CardTitle>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className={platform.className}>
                {platform.label}
              </Badge>
              {stock && (
                <Badge variant="secondary" className={stock.className}>
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
                className="h-8 w-8 shrink-0"
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="text-sm font-medium">
                {product.last_price !== null
                  ? formatPrice(product.last_price, product.currency)
                  : "Not checked yet"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Check</span>
              <span className="text-sm">
                {relativeTime(product.last_check_at)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center gap-1.5">
                <Circle
                  className={`h-2.5 w-2.5 fill-current ${status.color}`}
                />
                <span className="text-sm">{status.label}</span>
              </div>
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
