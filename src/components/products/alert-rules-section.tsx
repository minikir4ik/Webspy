"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Plus, Trash2 } from "lucide-react";
import {
  createAlertRule,
  toggleAlertRule,
  deleteAlertRule,
} from "@/lib/actions/alerts";
import type { AlertRule, AlertRuleType } from "@/lib/types/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const ruleTypeLabels: Record<AlertRuleType, string> = {
  price_drop_percent: "Price drops by %",
  price_drop_absolute: "Price drops by $",
  price_below: "Price drops below $",
  price_above: "Price rises above $",
  price_increases: "Price increases by %",
  stock_change: "Stock status changes",
  competitor_undercuts_me: "Competitor undercuts my price",
};

const ruleTypeOptions: { value: AlertRuleType; label: string }[] = [
  { value: "price_drop_percent", label: "Price drops by %" },
  { value: "price_drop_absolute", label: "Price drops by $ amount" },
  { value: "price_below", label: "Price drops below $" },
  { value: "price_above", label: "Price rises above $" },
  { value: "price_increases", label: "Price increases by %" },
  { value: "stock_change", label: "Stock status changes" },
  { value: "competitor_undercuts_me", label: "Competitor undercuts my price" },
];

const cooldownOptions = [
  { value: "60", label: "1 hour" },
  { value: "360", label: "6 hours" },
  { value: "720", label: "12 hours" },
  { value: "1440", label: "24 hours" },
];

function formatThreshold(rule: AlertRule): string {
  if (rule.rule_type === "stock_change") return "Any change";
  if (rule.rule_type === "competitor_undercuts_me") return "Auto";
  if (rule.threshold === null) return "—";
  if (
    rule.rule_type === "price_drop_percent" ||
    rule.rule_type === "price_increases"
  ) {
    return `${rule.threshold}%`;
  }
  return `$${rule.threshold}`;
}

function formatCooldown(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${minutes / 60}h`;
}

interface AlertRulesSectionProps {
  productId: string;
  rules: AlertRule[];
  myPrice: number | null;
}

export function AlertRulesSection({
  productId,
  rules,
  myPrice,
}: AlertRulesSectionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AlertRuleType>("price_drop_percent");
  const router = useRouter();

  const needsThreshold =
    selectedType !== "stock_change" && selectedType !== "competitor_undercuts_me";

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("product_id", productId);
    const result = await createAlertRule(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  async function handleToggle(ruleId: string, currentActive: boolean) {
    await toggleAlertRule(ruleId, !currentActive);
    router.refresh();
  }

  async function handleDelete(ruleId: string) {
    await deleteAlertRule(ruleId);
    router.refresh();
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
              <Bell className="h-4 w-4 text-indigo-600" />
            </div>
            <CardTitle className="text-base font-semibold text-slate-900">Alert Rules</CardTitle>
          </div>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setError(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary border-0 text-white hover:opacity-90">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Alert Rule</DialogTitle>
                <DialogDescription>
                  Get notified when conditions are met for this product.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="rule_type">Rule Type</Label>
                    <select
                      id="rule_type"
                      name="rule_type"
                      value={selectedType}
                      onChange={(e) =>
                        setSelectedType(e.target.value as AlertRuleType)
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {ruleTypeOptions
                        .filter(
                          (o) =>
                            o.value !== "competitor_undercuts_me" ||
                            myPrice !== null
                        )
                        .map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                    </select>
                  </div>
                  {needsThreshold && (
                    <div className="space-y-2">
                      <Label htmlFor="threshold">
                        Threshold
                        {selectedType.includes("percent") ||
                        selectedType === "price_increases"
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
                          selectedType.includes("percent") ||
                          selectedType === "price_increases"
                            ? "e.g., 10"
                            : "e.g., 5.00"
                        }
                      />
                    </div>
                  )}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="gradient-primary border-0 text-white hover:opacity-90">
                    {loading ? "Creating..." : "Create Rule"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-slate-500">
          Configure notifications for price changes and stock updates.
        </p>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">
              No alert rules configured. Add a rule to get notified.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {ruleTypeLabels[rule.rule_type]}
                    </span>
                    <Badge
                      variant="secondary"
                      className={
                        rule.is_active
                          ? "bg-emerald-50 text-emerald-700 border-0 text-[11px] h-5 px-1.5"
                          : "bg-slate-100 text-slate-500 border-0 text-[11px] h-5 px-1.5"
                      }
                    >
                      {rule.is_active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Threshold: {formatThreshold(rule)}</span>
                    <span>Cooldown: {formatCooldown(rule.cooldown_minutes)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-slate-600"
                    onClick={() => handleToggle(rule.id, rule.is_active)}
                  >
                    {rule.is_active ? "Pause" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-destructive"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
