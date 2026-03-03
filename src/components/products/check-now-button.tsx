"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckNowButtonProps {
  productId: string;
}

export function CheckNowButton({ productId }: CheckNowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleCheck() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/products/${productId}/check`, {
        method: "POST",
      });

      let data: Record<string, unknown>;
      try {
        data = await response.json();
      } catch {
        setError(`Server error (${response.status})`);
        return;
      }

      if (!response.ok) {
        setError((data.error as string) || `Check failed (${response.status})`);
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      setError(`Network error: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCheck}
        disabled={loading}
      >
        <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Checking..." : "Check Now"}
      </Button>
      {error && (
        <span className="text-sm text-destructive">{error}</span>
      )}
      {success && !loading && (
        <span className="text-sm text-green-600">Updated!</span>
      )}
    </div>
  );
}
