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
  shopify: "bg-green-100 text-green-800",
  amazon: "bg-orange-100 text-orange-800",
  walmart: "bg-blue-100 text-blue-800",
  generic: "bg-gray-100 text-gray-800",
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
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(
    null
  );
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
    const result = await addProduct(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    setDetectedPlatform(null);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); setDetectedPlatform(null); } }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tracked Product</DialogTitle>
          <DialogDescription>
            Enter a competitor product URL to start monitoring.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
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
              <p className="text-xs text-muted-foreground">
                Enter your own price so we can alert you when a competitor
                undercuts you.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
