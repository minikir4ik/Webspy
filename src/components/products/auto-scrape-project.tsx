"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface AutoScrapeProjectProps {
  projectId: string;
  productCount: number;
}

export function AutoScrapeProject({ projectId, productCount }: AutoScrapeProjectProps) {
  const [status, setStatus] = useState<"idle" | "checking" | "done" | "failed">("idle");
  const [summary, setSummary] = useState<{ succeeded: number; failed: number; skipped: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (productCount === 0) return;

    let cancelled = false;
    setStatus("checking");

    fetch(`/api/projects/${projectId}/check-all`, { method: "POST" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
          setStatus("done");
          if (data.checked > 0) {
            router.refresh();
          }
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
  }, [projectId, productCount, router]);

  if (status === "idle") return null;

  return (
    <div className="mb-4">
      {status === "checking" && (
        <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Updating {productCount} product{productCount !== 1 ? "s" : ""}...
        </div>
      )}
      {status === "done" && summary && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {summary.succeeded > 0 && `${summary.succeeded} updated`}
          {summary.failed > 0 && `, ${summary.failed} failed`}
          {summary.skipped > 0 && `, ${summary.skipped} already up to date`}
          {summary.succeeded === 0 && summary.failed === 0 && "All products up to date"}
        </div>
      )}
      {status === "failed" && (
        <div className="flex items-center gap-2 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          Batch update failed — using last known data
        </div>
      )}
    </div>
  );
}
