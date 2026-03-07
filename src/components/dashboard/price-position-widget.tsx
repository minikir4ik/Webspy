"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import type { TrackedProduct } from "@/lib/types/database";

interface PricePositionWidgetProps {
  products: TrackedProduct[];
}

export function PricePositionWidget({ products }: PricePositionWidgetProps) {
  const position = useMemo(() => {
    const ownProducts = products.filter((p) => p.is_own_product && p.last_price !== null);
    const competitors = products.filter((p) => !p.is_own_product && p.last_price !== null);

    if (ownProducts.length === 0 || competitors.length === 0) return null;

    let cheapest = 0;
    let midRange = 0;
    let mostExpensive = 0;

    for (const own of ownProducts) {
      if (own.last_price === null) continue;

      // Find competitors in the same project
      const projectCompetitors = competitors.filter(
        (c) => c.project_id === own.project_id && c.last_price !== null
      );
      if (projectCompetitors.length === 0) continue;

      const cheaper = projectCompetitors.filter((c) => c.last_price! > own.last_price!).length;
      const total = projectCompetitors.length;
      const ratio = cheaper / total;

      if (ratio >= 0.6) cheapest++;
      else if (ratio >= 0.3) midRange++;
      else mostExpensive++;
    }

    const total = cheapest + midRange + mostExpensive;
    if (total === 0) return null;

    return { cheapest, midRange, mostExpensive, total };
  }, [products]);

  if (!position) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
            <Target className="h-4 w-4 text-indigo-600" />
          </div>
          <CardTitle className="text-base font-semibold text-slate-900">Price Positioning</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-sm font-bold text-emerald-700">{position.cheapest}</span>
            </div>
            <span className="text-xs text-slate-600">Cheapest</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-sm font-bold text-amber-700">{position.midRange}</span>
            </div>
            <span className="text-xs text-slate-600">Mid-range</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center">
              <span className="text-sm font-bold text-rose-700">{position.mostExpensive}</span>
            </div>
            <span className="text-xs text-slate-600">Most expensive</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Across all projects, showing your price position vs competitors.
        </p>
      </CardContent>
    </Card>
  );
}
