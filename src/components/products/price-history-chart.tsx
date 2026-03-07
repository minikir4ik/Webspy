"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PriceCheck, Anomaly } from "@/lib/types/database";
import { formatPrice } from "@/lib/utils/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus, AlertTriangle } from "lucide-react";

type Range = "7d" | "30d" | "90d" | "all";

const stockColors: Record<string, string> = {
  in_stock: "#10b981",
  out_of_stock: "#f43f5e",
  limited: "#f59e0b",
  unknown: "#94a3b8",
};

const stockLabels: Record<string, string> = {
  in_stock: "In Stock",
  out_of_stock: "Out of Stock",
  limited: "Limited",
  unknown: "Unknown",
};

interface PriceHistoryChartProps {
  checks: PriceCheck[];
  currency: string;
  anomalies?: Anomaly[];
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  price: number | null;
  stockStatus: string | null;
  currency: string;
  anomaly?: Anomaly;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (cx === undefined || cy === undefined) return null;

  if (payload?.anomaly) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#f43f5e" stroke="white" strokeWidth={2} />
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={10} fill="#f43f5e">
          !
        </text>
      </g>
    );
  }

  const color = stockColors[payload?.stockStatus ?? "unknown"] ?? "#94a3b8";
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />;
}

interface TooltipPayloadItem {
  payload: ChartDataPoint;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const stockLabel = data.stockStatus ? (stockLabels[data.stockStatus] ?? "Unknown") : "Unknown";
  const stockColor = stockColors[data.stockStatus ?? "unknown"] ?? "#94a3b8";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-sm">
      <p className="text-lg font-bold text-slate-900">{formatPrice(data.price, data.currency)}</p>
      <p className="text-xs text-slate-500 mt-1">{formatDateTime(data.date)}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stockColor }} />
        <p className="text-xs text-slate-500">{stockLabel}</p>
      </div>
      {data.anomaly && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-xs text-rose-600">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-medium">Anomaly</span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">{data.anomaly.description}</p>
        </div>
      )}
    </div>
  );
}

export function PriceHistoryChart({ checks, currency, anomalies = [] }: PriceHistoryChartProps) {
  const [range, setRange] = useState<Range>("all");

  const filteredChecks = useMemo(() => {
    if (range === "all") return checks;
    const now = Date.now();
    const ms = { "7d": 7, "30d": 30, "90d": 90 }[range] * 24 * 60 * 60 * 1000;
    const cutoff = now - ms;
    return checks.filter((c) => new Date(c.checked_at).getTime() >= cutoff);
  }, [checks, range]);

  const chartData = useMemo(() => {
    // Build a map of anomaly timestamps for quick lookup
    const anomalyMap = new Map<string, Anomaly>();
    for (const a of anomalies) {
      // Match anomaly to nearest check (same day)
      const dateKey = a.detected_at.slice(0, 10);
      anomalyMap.set(dateKey, a);
    }

    return filteredChecks
      .filter((c) => c.price !== null)
      .map((c) => ({
        date: c.checked_at,
        dateLabel: formatDateShort(c.checked_at),
        price: c.price,
        stockStatus: c.stock_status,
        currency,
        anomaly: anomalyMap.get(c.checked_at.slice(0, 10)),
      }));
  }, [filteredChecks, currency, anomalies]);

  // Summary stats
  const stats = useMemo(() => {
    const prices = chartData.filter((d) => d.price !== null).map((d) => d.price as number);
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const current = prices[prices.length - 1];
    const first = prices[0];
    const changePercent = first > 0 ? ((current - first) / first) * 100 : 0;
    return { min, max, current, changePercent };
  }, [chartData]);

  const ranges: { label: string; value: Range }[] = [
    { label: "7d", value: "7d" },
    { label: "30d", value: "30d" },
    { label: "90d", value: "90d" },
    { label: "All", value: "all" },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">Price History</CardTitle>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
            {ranges.map((r) => (
              <button
                key={r.value}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  range === r.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {stats && (
          <div className="flex items-center gap-6 mt-2">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-slate-500">Current</p>
                <p className="text-sm font-bold text-slate-900">{formatPrice(stats.current, currency)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Low</p>
                <p className="text-sm font-semibold text-emerald-600">{formatPrice(stats.min, currency)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">High</p>
                <p className="text-sm font-semibold text-rose-600">{formatPrice(stats.max, currency)}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              stats.changePercent < 0
                ? "bg-emerald-50 text-emerald-700"
                : stats.changePercent > 0
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-50 text-slate-600"
            }`}>
              {stats.changePercent < 0 ? (
                <ArrowDown className="h-3 w-3" />
              ) : stats.changePercent > 0 ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {Math.abs(stats.changePercent).toFixed(1)}%
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">
              No price history yet. Data will appear after the first check.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#priceGradient)"
                  dot={<CustomDot />}
                  activeDot={{ r: 6, fill: "#6366f1", stroke: "white", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-100">
              {Object.entries(stockLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stockColors[key] }}
                  />
                  <span className="text-[11px] text-slate-500">{label}</span>
                </div>
              ))}
              {anomalies.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="text-[11px] text-slate-500">Anomaly</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
