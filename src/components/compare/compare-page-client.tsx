"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BarChart3, Save, X, Check } from "lucide-react";
import { formatPrice } from "@/lib/utils/format";
import type { TrackedProduct, PriceCheck, SavedComparison } from "@/lib/types/database";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#6366f1", "#10b981", "#f43f5e", "#f59e0b", "#8b5cf6"];

interface ComparePageClientProps {
  allProducts: TrackedProduct[];
  initialSelected: TrackedProduct[];
  priceHistories: Record<string, PriceCheck[]>;
  savedComparisons: SavedComparison[];
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ComparePageClient({
  allProducts,
  initialSelected,
  priceHistories,
  savedComparisons,
}: ComparePageClientProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected.map((p) => p.id));
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const selectedProducts = allProducts.filter((p) => selected.includes(p.id));

  function toggleProduct(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  }

  function applySelection() {
    if (selected.length >= 2) {
      router.push(`/compare?products=${selected.join(",")}`);
    }
  }

  async function handleSave() {
    if (!saveName.trim() || selected.length < 2) return;
    setSaving(true);
    await fetch("/api/comparisons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName.trim(), product_ids: selected }),
    });
    setSaveName("");
    setSaving(false);
    router.refresh();
  }

  // Build overlay chart data
  const chartData = useMemo(() => {
    if (Object.keys(priceHistories).length === 0) return [];

    const allDates = new Set<string>();
    for (const checks of Object.values(priceHistories)) {
      for (const c of checks) {
        allDates.add(c.checked_at.slice(0, 10));
      }
    }

    const sortedDates = Array.from(allDates).sort();
    return sortedDates.map((date) => {
      const point: Record<string, string | number | null> = { date: formatDateShort(date) };
      for (const p of selectedProducts) {
        const checks = priceHistories[p.id] || [];
        const dayChecks = checks.filter((c) => c.checked_at.startsWith(date));
        const lastCheck = dayChecks[dayChecks.length - 1];
        point[p.id] = lastCheck?.price ?? null;
      }
      return point;
    });
  }, [priceHistories, selectedProducts]);

  // Stats
  const stats = useMemo(() => {
    return selectedProducts.map((p) => {
      const checks = priceHistories[p.id] || [];
      const prices = checks.map((c) => c.price).filter((x): x is number => x !== null);
      if (prices.length === 0) return { product: p, avg: 0, min: 0, max: 0, stddev: 0, checks: 0, stockPct: 0 };

      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const variance = prices.reduce((a, b) => a + (b - avg) ** 2, 0) / prices.length;
      const stddev = Math.sqrt(variance);
      const stockChecks = checks.filter((c) => c.stock_status === "in_stock").length;
      const stockPct = checks.length > 0 ? (stockChecks / checks.length) * 100 : 0;

      return { product: p, avg, min, max, stddev, checks: checks.length, stockPct };
    });
  }, [selectedProducts, priceHistories]);

  // Cheapest pie data
  const cheapestData = useMemo(() => {
    if (Object.keys(priceHistories).length === 0 || selectedProducts.length < 2) return [];

    const allDates = new Set<string>();
    for (const checks of Object.values(priceHistories)) {
      for (const c of checks) allDates.add(c.checked_at.slice(0, 10));
    }

    const counts: Record<string, number> = {};
    selectedProducts.forEach((p) => (counts[p.id] = 0));

    for (const date of allDates) {
      let cheapestId = "";
      let cheapestPrice = Infinity;
      for (const p of selectedProducts) {
        const checks = priceHistories[p.id] || [];
        const dayChecks = checks.filter((c) => c.checked_at.startsWith(date));
        const lastCheck = dayChecks[dayChecks.length - 1];
        if (lastCheck?.price !== null && lastCheck?.price !== undefined && lastCheck.price < cheapestPrice) {
          cheapestPrice = lastCheck.price;
          cheapestId = p.id;
        }
      }
      if (cheapestId) counts[cheapestId]++;
    }

    return selectedProducts.map((p, i) => ({
      name: (p.product_name || "Product").slice(0, 15),
      value: counts[p.id] || 0,
      color: COLORS[i % COLORS.length],
    }));
  }, [priceHistories, selectedProducts]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Compare Products</h1>
        <p className="text-sm text-slate-500 mt-1">Select 2-5 products to compare side-by-side.</p>
      </div>

      {/* Product Selection */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Select Products ({selected.length}/5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {allProducts.map((p) => {
              const isSelected = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  } ${!isSelected && selected.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={!isSelected && selected.length >= 5}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  {p.product_name || "Product"}
                  {p.is_own_product && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0 text-[10px] h-4 px-1 ml-1">
                      Yours
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={applySelection} disabled={selected.length < 2} className="gradient-primary border-0 text-white hover:opacity-90">
              <BarChart3 className="mr-2 h-4 w-4" />
              Compare ({selected.length})
            </Button>
            {selected.length >= 2 && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Save as..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="h-8 w-40 text-sm"
                />
                <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !saveName.trim()}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Saved comparisons */}
          {savedComparisons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Saved</p>
              <div className="flex flex-wrap gap-2">
                {savedComparisons.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => {
                      setSelected(sc.product_ids);
                      router.push(`/compare?products=${sc.product_ids.join(",")}`);
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    {sc.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {selectedProducts.length >= 2 && Object.keys(priceHistories).length > 0 && (
        <>
          {/* Price Overlay Chart */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Price History Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={((value: unknown, name?: string) => {
                      const p = selectedProducts.find((x) => x.id === (name ?? ""));
                      const v = typeof value === "number" ? `$${value.toFixed(2)}` : "N/A";
                      return [v, p?.product_name || "Product"];
                    }) as never}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const p = selectedProducts.find((x) => x.id === value);
                      return (p?.product_name || "Product").slice(0, 20);
                    }}
                  />
                  {selectedProducts.map((p, i) => (
                    <Line
                      key={p.id}
                      type="monotone"
                      dataKey={p.id}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stats Table */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-4 text-xs text-slate-500 font-medium">Product</th>
                      <th className="text-right py-2 px-3 text-xs text-slate-500 font-medium">Current</th>
                      <th className="text-right py-2 px-3 text-xs text-slate-500 font-medium">Avg (30d)</th>
                      <th className="text-right py-2 px-3 text-xs text-slate-500 font-medium">Min</th>
                      <th className="text-right py-2 px-3 text-xs text-slate-500 font-medium">Max</th>
                      <th className="text-right py-2 px-3 text-xs text-slate-500 font-medium">Volatility</th>
                      <th className="text-right py-2 px-3 text-xs text-slate-500 font-medium">In Stock %</th>
                      <th className="text-right py-2 pl-3 text-xs text-slate-500 font-medium">Checks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s, i) => (
                      <tr key={s.product.id} className="border-b border-slate-100">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="font-medium text-slate-900 truncate max-w-[150px]">
                              {s.product.product_name || "Product"}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-2.5 px-3 font-semibold text-slate-900">{formatPrice(s.product.last_price, s.product.currency)}</td>
                        <td className="text-right py-2.5 px-3 text-slate-700">${s.avg.toFixed(2)}</td>
                        <td className="text-right py-2.5 px-3 text-emerald-600">${s.min.toFixed(2)}</td>
                        <td className="text-right py-2.5 px-3 text-rose-600">${s.max.toFixed(2)}</td>
                        <td className="text-right py-2.5 px-3 text-slate-600">${s.stddev.toFixed(2)}</td>
                        <td className="text-right py-2.5 px-3 text-slate-600">{s.stockPct.toFixed(0)}%</td>
                        <td className="text-right py-2.5 pl-3 text-slate-500">{s.checks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Cheapest Pie Chart */}
          {cheapestData.length > 0 && cheapestData.some((d) => d.value > 0) && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Who&apos;s Cheapest?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width={300} height={250}>
                    <PieChart>
                      <Pie
                        data={cheapestData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={(({ name, percent }: { name?: string; percent?: number }) =>
                          `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                        ) as never}
                      >
                        {cheapestData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={((value: unknown) => [`${value} days`, "Cheapest"]) as never} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center text-xs text-slate-500 mt-2">
                  % of days each product was the cheapest option
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
