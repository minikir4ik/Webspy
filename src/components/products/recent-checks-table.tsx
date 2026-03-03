"use client";

import type { PriceCheck } from "@/lib/types/database";
import { formatPrice } from "@/lib/utils/format";
import {
  Card,
  CardContent,
  CardDescription,
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
import { ArrowDown, ArrowUp, Minus, ClipboardList } from "lucide-react";

const stockConfig: Record<string, { label: string; className: string }> = {
  in_stock: { label: "In Stock", className: "bg-green-100 text-green-800" },
  out_of_stock: { label: "Out of Stock", className: "bg-red-100 text-red-800" },
  limited: { label: "Limited", className: "bg-yellow-100 text-yellow-800" },
  unknown: { label: "Unknown", className: "bg-gray-100 text-gray-800" },
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Recent Checks</CardTitle>
        </div>
        <CardDescription>Last 20 price checks for this product.</CardDescription>
      </CardHeader>
      <CardContent>
        {checks.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">No checks yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Stock Status</TableHead>
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
                  <TableRow key={check.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(check.checked_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(check.price, currency)}
                    </TableCell>
                    <TableCell>
                      {changePercent !== null && changeAbsolute !== null ? (
                        <div className="flex items-center gap-1">
                          {changeAbsolute > 0 ? (
                            <ArrowUp className="h-3.5 w-3.5 text-red-500" />
                          ) : changeAbsolute < 0 ? (
                            <ArrowDown className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-gray-400" />
                          )}
                          <span
                            className={
                              changeAbsolute > 0
                                ? "text-red-600"
                                : changeAbsolute < 0
                                  ? "text-green-600"
                                  : "text-gray-500"
                            }
                          >
                            {changePercent > 0 ? "+" : ""}
                            {changePercent.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {stock ? (
                        <Badge variant="secondary" className={stock.className}>
                          {stock.label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
