"use client";

import type { PriceCheck } from "@/lib/types/database";
import { formatPrice } from "@/lib/utils/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

const stockConfig: Record<string, { label: string; className: string }> = {
  in_stock: { label: "In Stock", className: "bg-emerald-50 text-emerald-700 border-0" },
  out_of_stock: { label: "Out of Stock", className: "bg-rose-50 text-rose-700 border-0" },
  limited: { label: "Limited", className: "bg-amber-50 text-amber-700 border-0" },
  unknown: { label: "Unknown", className: "bg-slate-50 text-slate-600 border-0" },
};

interface RecentChecksTableProps {
  checks: PriceCheck[];
  currency: string;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RecentChecksTable({ checks, currency }: RecentChecksTableProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">Recent Checks</CardTitle>
        <p className="text-sm text-slate-500">Last 20 price checks for this product.</p>
      </CardHeader>
      <CardContent>
        {checks.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">No checks yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-xs font-medium text-slate-500">Date</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">Price</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">Change</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((check, idx) => {
                  const prevCheck = idx < checks.length - 1 ? checks[idx + 1] : null;
                  let changePercent: number | null = null;
                  let changeAbsolute: number | null = null;

                  if (
                    check.price !== null &&
                    prevCheck?.price !== null &&
                    prevCheck?.price !== undefined &&
                    prevCheck.price > 0
                  ) {
                    changeAbsolute = check.price - prevCheck.price;
                    changePercent =
                      ((check.price - prevCheck.price) / prevCheck.price) * 100;
                  }

                  const stock = check.stock_status
                    ? stockConfig[check.stock_status] ?? stockConfig.unknown
                    : null;

                  return (
                    <TableRow key={check.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs text-slate-500">
                        {formatDateTime(check.checked_at)}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-900">
                        {formatPrice(check.price, currency)}
                      </TableCell>
                      <TableCell>
                        {changePercent !== null && changeAbsolute !== null ? (
                          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            changeAbsolute < 0
                              ? "bg-emerald-50 text-emerald-700"
                              : changeAbsolute > 0
                                ? "bg-rose-50 text-rose-700"
                                : "bg-slate-50 text-slate-600"
                          }`}>
                            {changeAbsolute > 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : changeAbsolute < 0 ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                            {changePercent > 0 ? "+" : ""}
                            {changePercent.toFixed(1)}%
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stock ? (
                          <Badge variant="secondary" className={stock.className + " text-[11px] h-5 px-1.5"}>
                            {stock.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
