"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createAlertRule } from "@/lib/actions/alerts";
import type { AlertRuleType } from "@/lib/types/database";
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

interface ProjectOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  project_id: string;
  product_name: string | null;
  url: string;
  my_price: number | null;
}

interface CreateAlertPageDialogProps {
  projects: ProjectOption[];
  products: ProductOption[];
}

const ruleTypeOptions: { value: AlertRuleType; label: string; needsMyPrice?: boolean }[] = [
  { value: "price_drop_percent", label: "Price drops by %" },
  { value: "price_drop_absolute", label: "Price drops by $ amount" },
  { value: "price_below", label: "Price drops below $" },
  { value: "price_above", label: "Price rises above $" },
  { value: "price_increases", label: "Price increases by %" },
  { value: "stock_change", label: "Stock status changes" },
  { value: "competitor_undercuts_me", label: "Competitor undercuts my price", needsMyPrice: true },
];

const cooldownOptions = [
  { value: "60", label: "1 hour" },
  { value: "360", label: "6 hours" },
  { value: "720", label: "12 hours" },
  { value: "1440", label: "24 hours" },
];

export function CreateAlertPageDialog({ projects, products }: CreateAlertPageDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<AlertRuleType>("price_drop_percent");
  const router = useRouter();

  const filteredProducts = useMemo(
    () => products.filter((p) => p.project_id === selectedProjectId),
    [products, selectedProjectId]
  );

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const hasMyPrice = selectedProduct?.my_price !== null && selectedProduct?.my_price !== undefined;

  const needsThreshold =
    selectedType !== "stock_change" && selectedType !== "competitor_undercuts_me";

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedProductId("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProductId) {
      setError("Please select a product");
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("product_id", selectedProductId);
    const result = await createAlertRule(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    setSelectedProjectId("");
    setSelectedProductId("");
    setSelectedType("price_drop_percent");
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setError(null);
          setSelectedProjectId("");
          setSelectedProductId("");
          setSelectedType("price_drop_percent");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="gradient-primary border-0 text-white shadow-sm hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" />
          New Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Alert Rule</DialogTitle>
          <DialogDescription>
            Get notified when conditions are met for a product.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* Step 1: Select Project */}
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <select
                id="project"
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Product */}
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <select
                id="product"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={!selectedProjectId}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">
                  {selectedProjectId
                    ? filteredProducts.length === 0
                      ? "No products in this project"
                      : "Select a product..."
                    : "Select a project first"}
                </option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name || new URL(p.url).hostname}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Rule Type */}
            <div className="space-y-2">
              <Label htmlFor="rule_type">Rule Type</Label>
              <select
                id="rule_type"
                name="rule_type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as AlertRuleType)}
                disabled={!selectedProductId}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                {ruleTypeOptions
                  .filter((o) => !o.needsMyPrice || hasMyPrice)
                  .map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* Step 4: Threshold */}
            {needsThreshold && (
              <div className="space-y-2">
                <Label htmlFor="threshold">
                  Threshold
                  {selectedType.includes("percent") || selectedType === "price_increases"
                    ? " (%)"
                    : " ($)"}
                </Label>
                <Input
                  id="threshold"
                  name="threshold"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder={
                    selectedType.includes("percent") || selectedType === "price_increases"
                      ? "e.g., 10"
                      : "e.g., 5.00"
                  }
                />
              </div>
            )}

            {/* Step 5: Cooldown */}
            <div className="space-y-2">
              <Label htmlFor="cooldown_minutes">Cooldown</Label>
              <select
                id="cooldown_minutes"
                name="cooldown_minutes"
                defaultValue="360"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {cooldownOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Minimum time between repeated alerts for this rule.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedProductId}
              className="gradient-primary border-0 text-white hover:opacity-90"
            >
              {loading ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
