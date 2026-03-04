"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toggleAlertRule, deleteAlertRule } from "@/lib/actions/alerts";
import type { AlertRule, AlertRuleType } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ruleTypeLabels: Record<AlertRuleType, string> = {
  price_drop_percent: "Price drops by %",
  price_drop_absolute: "Price drops by $",
  price_below: "Price below $",
  price_above: "Price above $",
  price_increases: "Price increases by %",
  stock_change: "Stock status changes",
  competitor_undercuts_me: "Competitor undercuts me",
};

function formatThreshold(rule: AlertRule): string {
  if (rule.rule_type === "stock_change") return "Any change";
  if (rule.rule_type === "competitor_undercuts_me") return "Auto";
  if (rule.threshold === null) return "—";
  if (rule.rule_type === "price_drop_percent" || rule.rule_type === "price_increases") {
    return `${rule.threshold}%`;
  }
  return `$${rule.threshold}`;
}

function formatCooldown(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${minutes / 60}h`;
}

interface AlertRuleRowProps {
  rule: AlertRule;
}

export function AlertRuleRow({ rule }: AlertRuleRowProps) {
  const router = useRouter();

  async function handleToggle() {
    await toggleAlertRule(rule.id, !rule.is_active);
    router.refresh();
  }

  async function handleDelete() {
    await deleteAlertRule(rule.id);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
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
          onClick={handleToggle}
        >
          {rule.is_active ? "Pause" : "Enable"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
