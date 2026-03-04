"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface AutoScrapeProps {
  productId: string;
  lastCheckAt: string | null;
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function AutoScrape({ productId, lastCheckAt }: AutoScrapeProps) {
  const [status, setStatus] = useState<"idle" | "checking" | "done" | "failed">("idle");
  const router = useRouter();

  useEffect(() => {
    if (lastCheckAt) {
      const elapsed = Date.now() - new Date(lastCheckAt).getTime();
      if (elapsed < STALE_THRESHOLD_MS) {
        return;
      }
    }

    let cancelled = false;
    setStatus("checking");

    fetch(`/api/products/${productId}/check`, { method: "POST" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          setStatus("done");
          router.refresh();
        } else {
          setStatus("failed");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [productId, lastCheckAt, router]);

  if (status === "idle") return null;

  return (
    <div className="mb-4">
      {status === "checking" && (
        <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Updating...
        </div>
      )}
      {status === "done" && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Updated just now
        </div>
      )}
      {status === "failed" && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          Update failed — using last known data
        </div>
      )}
    </div>
  );
}
