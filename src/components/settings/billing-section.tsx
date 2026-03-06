"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard, Zap, ArrowUpRight } from "lucide-react";
import type { Plan } from "@/lib/types/database";

const planDetails: Record<
  Plan,
  { label: string; className: string; products: number; projects: number; interval: string }
> = {
  free: { label: "Free", className: "bg-slate-100 text-slate-600", products: 10, projects: 2, interval: "24h" },
  starter: { label: "Starter", className: "bg-blue-50 text-blue-700", products: 100, projects: 10, interval: "1h" },
  pro: { label: "Pro", className: "bg-indigo-50 text-indigo-700", products: 500, projects: 999, interval: "15m" },
  business: { label: "Business", className: "bg-purple-50 text-purple-700", products: 5000, projects: 999, interval: "5m" },
};

interface BillingSectionProps {
  plan: Plan;
  productCount: number;
  projectCount: number;
  hasStripeCustomer: boolean;
}

export function BillingSection({
  plan,
  productCount,
  projectCount,
  hasStripeCustomer,
}: BillingSectionProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const details = planDetails[plan];

  async function handleUpgrade(priceId: string) {
    setLoading(priceId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  }

  async function handleManageBilling() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  }

  const upgradePlans = [
    { key: "starter", label: "Starter — $19/mo", envKey: "NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID" },
    { key: "pro", label: "Pro — $49/mo", envKey: "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID" },
    { key: "business", label: "Business — $149/mo", envKey: "NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID" },
  ];

  const priceIds: Record<string, string | undefined> = {
    starter: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
    pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    business: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
            <CreditCard className="h-4 w-4 text-indigo-600" />
          </div>
          <CardTitle className="text-base font-semibold text-slate-900">
            Billing & Usage
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Current plan */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Current Plan</span>
          <Badge variant="secondary" className={`${details.className} border-0`}>
            {details.label}
          </Badge>
        </div>

        {/* Usage bars */}
        <div className="space-y-3">
          <UsageBar
            label="Products"
            used={productCount}
            limit={details.products}
          />
          <UsageBar
            label="Projects"
            used={projectCount}
            limit={details.projects}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Check interval</span>
            <span className="font-medium text-slate-700">{details.interval}</span>
          </div>
        </div>

        {/* Actions */}
        {hasStripeCustomer && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleManageBilling}
            disabled={loading === "portal"}
          >
            <ArrowUpRight className="mr-2 h-4 w-4" />
            {loading === "portal" ? "Opening..." : "Manage Subscription"}
          </Button>
        )}

        {plan === "free" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Upgrade your plan
            </p>
            {upgradePlans.map((p) => (
              <Button
                key={p.key}
                variant="outline"
                className="w-full justify-between"
                onClick={() => {
                  const id = priceIds[p.key];
                  if (id) handleUpgrade(id);
                }}
                disabled={loading === p.key || !priceIds[p.key]}
              >
                <span className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-indigo-500" />
                  {p.label}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
              </Button>
            ))}
          </div>
        )}

        {plan !== "free" && !hasStripeCustomer && (
          <p className="text-xs text-slate-400 text-center">
            Plan managed externally
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100);
  const isHigh = pct > 80;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-slate-500">{label}</span>
        <span className={`font-medium ${isHigh ? "text-amber-600" : "text-slate-700"}`}>
          {used} / {limit === 999 ? "Unlimited" : limit}
        </span>
      </div>
      {limit !== 999 && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isHigh ? "bg-amber-500" : "bg-indigo-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
