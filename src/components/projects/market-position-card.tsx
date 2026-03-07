"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import type { TrackedProduct } from "@/lib/types/database";

interface MarketPositionCardProps {
  ownProducts: TrackedProduct[];
  competitorProducts: TrackedProduct[];
}

export function MarketPositionCard({ ownProducts, competitorProducts }: MarketPositionCardProps) {
  const position = useMemo(() => {
    // Use the first own product with a price as the reference
    const ownWithPrice = ownProducts.find((p) => p.last_price !== null);
    if (!ownWithPrice || ownWithPrice.last_price === null) return null;

    const myPrice = ownWithPrice.last_price;
    const competitorsWithPrice = competitorProducts.filter((p) => p.last_price !== null);
    if (competitorsWithPrice.length === 0) return null;

    let cheaper = 0;
    let same = 0;
    let moreExpensive = 0;

    for (const c of competitorsWithPrice) {
      if (c.last_price === null) continue;
      if (myPrice < c.last_price) cheaper++;
      else if (myPrice === c.last_price) same++;
      else moreExpensive++;
    }

    const total = cheaper + same + moreExpensive;
    return { cheaper, same, moreExpensive, total, myPrice };
  }, [ownProducts, competitorProducts]);

  if (!position) return null;

  const cheaperPct = (position.cheaper / position.total) * 100;
  const samePct = (position.same / position.total) * 100;
  const expensivePct = (position.moreExpensive / position.total) * 100;

  let summary: string;
  if (position.cheaper === position.total) {
    summary = "You are the cheapest option";
  } else if (position.moreExpensive === position.total) {
    summary = "You are the most expensive option";
  } else {
    summary = `You are cheaper than ${position.cheaper} of ${position.total} competitor${position.total !== 1 ? "s" : ""}`;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
            <Target className="h-4 w-4 text-indigo-600" />
          </div>
          <CardTitle className="text-base font-semibold text-slate-900">Market Position</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium text-slate-700 mb-4">{summary}</p>

        {/* Stacked bar */}
        <div className="h-3 rounded-full overflow-hidden flex mb-3">
          {cheaperPct > 0 && (
            <div className="bg-emerald-500" style={{ width: `${cheaperPct}%` }} />
          )}
          {samePct > 0 && (
            <div className="bg-amber-400" style={{ width: `${samePct}%` }} />
          )}
          {expensivePct > 0 && (
            <div className="bg-rose-500" style={{ width: `${expensivePct}%` }} />
          )}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Cheaper ({position.cheaper})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-600">Same ({position.same})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-600">More expensive ({position.moreExpensive})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
