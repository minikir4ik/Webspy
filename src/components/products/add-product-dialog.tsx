"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addProduct } from "@/lib/actions/products";
import { detectPlatform } from "@/lib/utils/platform";
import type { Platform } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const platformColors: Record<Platform, string> = {
  shopify: "bg-emerald-50 text-emerald-700 border-0",
  amazon: "bg-orange-50 text-orange-700 border-0",
  walmart: "bg-blue-50 text-blue-700 border-0",
  generic: "bg-slate-50 text-slate-600 border-0",
};

const platformLabels: Record<Platform, string> = {
  shopify: "Shopify",
  amazon: "Amazon",
  walmart: "Walmart",
  generic: "Generic",
};

interface AddProductDialogProps {
  projectId: string;
}

export function AddProductDialog({ projectId }: AddProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(null);
  const [isOwnProduct, setIsOwnProduct] = useState(false);
  const router = useRouter();

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      if (url.length > 10) {
        try {
          new URL(url);
          setDetectedPlatform(detectPlatform(url));
        } catch {
          setDetectedPlatform(null);
        }
      } else {
        setDetectedPlatform(null);
      }
    },
    []
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("project_id", projectId);
    formData.set("is_own_product", isOwnProduct ? "true" : "false");
    const result = await addProduct(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    setDetectedPlatform(null);
    setIsOwnProduct(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); setDetectedPlatform(null); setIsOwnProduct(false); } }}>
      <DialogTrigger asChild>
        <Button className="gradient-primary border-0 text-white shadow-sm hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tracked Product</DialogTitle>
          <DialogDescription>
            Enter a product URL to start monitoring.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Own product toggle */}
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <button
                type="button"
                role="switch"
                aria-checked={isOwnProduct}
                onClick={() => setIsOwnProduct(!isOwnProduct)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                  isOwnProduct ? "bg-indigo-500" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    isOwnProduct ? "translate-x-4" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-slate-900">This is my product</p>
                <p className="text-xs text-slate-500">
                  {isOwnProduct
                    ? "Tracking your own product for comparison"
                    : "Tracking a competitor's product"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Product URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="url"
                  name="url"
                  type="url"
                  placeholder="https://competitor.com/products/..."
                  required
                  onChange={handleUrlChange}
                  className="flex-1"
                />
                {detectedPlatform && (
                  <Badge
                    variant="secondary"
                    className={platformColors[detectedPlatform]}
                  >
                    {platformLabels[detectedPlatform]}
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name (optional)</Label>
              <Input
                id="product_name"
                name="product_name"
                placeholder="e.g., Nike Air Max 90"
              />
            </div>
            {!isOwnProduct && (
              <div className="space-y-2">
                <Label htmlFor="my_price">My Price (optional)</Label>
                <Input
                  id="my_price"
                  name="my_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Your price for comparison"
                />
                <p className="text-xs text-slate-500">
                  Enter your own price so we can alert you when a competitor
                  undercuts you.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary border-0 text-white hover:opacity-90">
              {loading ? "Adding..." : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
