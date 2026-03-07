"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils/format";
import type { TrackedProduct } from "@/lib/types/database";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface CompareViewProps {
  ownProducts: TrackedProduct[];
  competitorProducts: TrackedProduct[];
  projectId: string;
}

export function CompareView({ ownProducts, competitorProducts, projectId }: CompareViewProps) {
  const myProduct = ownProducts.find((p) => p.last_price !== null);
  const myPrice = myProduct?.last_price ?? null;

  const allProducts = [...ownProducts, ...competitorProducts].filter(
    (p) => p.last_price !== null
  );

  const chartData = useMemo(
    () =>
      allProducts.map((p) => ({
        name: (p.product_name || "Product").slice(0, 20),
        price: p.last_price ?? 0,
        isOwn: p.is_own_product,
        id: p.id,
      })),
    [allProducts]
  );

  const compareIds = allProducts.map((p) => p.id).join(",");

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
            <CardTitle className="text-base font-semibold text-slate-900">Price Comparison</CardTitle>
          </div>
          {allProducts.length >= 2 && (
            <Link href={`/compare?products=${compareIds}`}>
              <Button variant="outline" size="sm">
                Full Compare <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Comparison Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 text-xs text-slate-500 font-medium">Product</th>
                <th className="text-right py-2 px-4 text-xs text-slate-500 font-medium">Price</th>
                <th className="text-right py-2 px-4 text-xs text-slate-500 font-medium">Stock</th>
                {myPrice !== null && (
                  <th className="text-right py-2 pl-4 text-xs text-slate-500 font-medium">vs Yours</th>
                )}
              </tr>
            </thead>
            <tbody>
              {allProducts.map((p) => {
                const diff = myPrice !== null && p.last_price !== null ? p.last_price - myPrice : null;
                return (
                  <tr key={p.id} className={`border-b border-slate-100 ${p.is_own_product ? "bg-blue-50/50" : ""}`}>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 truncate max-w-[200px]">
                          {p.product_name || "Product"}
                        </span>
                        {p.is_own_product && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0 text-[10px] h-4 px-1">
                            Yours
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-4 font-semibold text-slate-900">
                      {formatPrice(p.last_price, p.currency)}
                    </td>
                    <td className="text-right py-2.5 px-4">
                      <span className={`text-xs ${
                        p.last_stock_status === "in_stock" ? "text-emerald-600" :
                        p.last_stock_status === "out_of_stock" ? "text-rose-600" : "text-slate-500"
                      }`}>
                        {p.last_stock_status?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "—"}
                      </span>
                    </td>
                    {myPrice !== null && (
                      <td className="text-right py-2.5 pl-4">
                        {p.is_own_product ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : diff !== null ? (
                          <span className={`text-xs font-medium ${
                            diff < 0 ? "text-emerald-600" : diff > 0 ? "text-rose-600" : "text-slate-500"
                          }`}>
                            {diff > 0 ? "+" : ""}{formatPrice(diff, p.currency)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Horizontal Bar Chart */}
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={Math.max(chartData.length * 40 + 20, 120)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v: number) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={120} />
              <Tooltip
                formatter={((value: unknown) => [typeof value === "number" ? `$${value.toFixed(2)}` : `${value}`, "Price"]) as never}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              {myPrice !== null && (
                <ReferenceLine x={myPrice} stroke="#6366f1" strokeDasharray="3 3" label={{ value: "Your price", position: "top", fontSize: 10, fill: "#6366f1" }} />
              )}
              <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.isOwn ? "#6366f1" :
                      myPrice !== null && entry.price < myPrice ? "#10b981" :
                      myPrice !== null && entry.price > myPrice ? "#f43f5e" :
                      "#94a3b8"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
