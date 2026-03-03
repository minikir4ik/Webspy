"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PriceCheck } from "@/lib/types/database";
import { formatPrice } from "@/lib/utils/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

type Range = "7d" | "30d" | "90d" | "all";

const stockColors: Record<string, string> = {
  in_stock: "#22c55e",
  out_of_stock: "#ef4444",
  limited: "#eab308",
  unknown: "#9ca3af",
};

interface PriceHistoryChartProps {
  checks: PriceCheck[];
  currency: string;
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

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: { stockStatus: string | null };
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (cx === undefined || cy === undefined) return null;
  const color = stockColors[payload?.stockStatus ?? "unknown"] ?? "#9ca3af";
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />;
}

interface TooltipPayloadItem {
  payload: {
    date: string;
    price: number | null;
    stockStatus: string | null;
    currency: string;
  };
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
  const stockLabel =
    data.stockStatus?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) ??
    "Unknown";
  return (
    <div className="rounded-md border bg-background p-3 shadow-md text-sm">
      <p className="font-medium">{formatPrice(data.price, data.currency)}</p>
      <p className="text-muted-foreground">{formatDateTime(data.date)}</p>
      <p className="text-muted-foreground">Stock: {stockLabel}</p>
    </div>
  );
}

export function PriceHistoryChart({ checks, currency }: PriceHistoryChartProps) {
  const [range, setRange] = useState<Range>("all");

  const filteredChecks = useMemo(() => {
    if (range === "all") return checks;
    const now = Date.now();
    const ms = { "7d": 7, "30d": 30, "90d": 90 }[range] * 24 * 60 * 60 * 1000;
    const cutoff = now - ms;
    return checks.filter((c) => new Date(c.checked_at).getTime() >= cutoff);
  }, [checks, range]);

  const chartData = useMemo(
    () =>
      filteredChecks
        .filter((c) => c.price !== null)
        .map((c) => ({
          date: c.checked_at,
          dateLabel: formatDateShort(c.checked_at),
          price: c.price,
          stockStatus: c.stock_status,
          currency,
        })),
    [filteredChecks, currency]
  );

  const ranges: { label: string; value: Range }[] = [
    { label: "7d", value: "7d" },
    { label: "30d", value: "30d" },
    { label: "90d", value: "90d" },
    { label: "All", value: "all" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Price History</CardTitle>
          </div>
          <div className="flex gap-1">
            {ranges.map((r) => (
              <Button
                key={r.value}
                variant={range === r.value ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>
        <CardDescription>
          Price trends over time. Dots are colored by stock status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              No price history yet. Data will appear after the first check.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v}`}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
