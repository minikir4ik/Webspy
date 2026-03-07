"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Anomaly } from "@/lib/types/database";

const severityColors: Record<string, string> = {
  high: "text-rose-600 bg-rose-50",
  medium: "text-amber-600 bg-amber-50",
  low: "text-blue-600 bg-blue-50",
};

export function AnomalyBell() {
  const [anomalies, setAnomalies] = useState<(Anomaly & { product_name?: string; project_id?: string })[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchAnomalies();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchAnomalies() {
    try {
      const res = await fetch("/api/anomalies");
      const data = await res.json();
      setAnomalies(data.anomalies || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string, productId: string, projectId: string) {
    await fetch("/api/anomalies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAnomalies((prev) => prev.filter((a) => a.id !== id));
    setOpen(false);
    router.push(`/projects/${projectId}/products/${productId}`);
  }

  const unreadCount = anomalies.filter((a) => !a.is_read).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Anomalies</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {anomalies.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-slate-400">No anomalies detected</p>
              </div>
            ) : (
              anomalies.map((a) => (
                <button
                  key={a.id}
                  onClick={() => markRead(a.id, a.product_id, a.project_id || "")}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50"
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${severityColors[a.severity]}`}>
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{a.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={`${severityColors[a.severity]} border-0 text-[10px] h-4 px-1`}>
                          {a.severity}
                        </Badge>
                        <span className="text-[10px] text-slate-400">
                          {new Date(a.detected_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
