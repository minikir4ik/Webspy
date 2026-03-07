"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function InsightsPage() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchInsights(force = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setAnalysis(data.analysis);
        setGeneratedAt(data.generated_at);
      }
    } catch {
      setError("Failed to load insights");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInsights();
  }, []);

  const minutesAgo = generatedAt
    ? Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000)
    : null;

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            AI Insights
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            AI-powered competitive analysis of your market.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchInsights(true)}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analyzing..." : "Refresh Analysis"}
        </Button>
      </div>

      {generatedAt && minutesAgo !== null && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          Last analyzed: {minutesAgo < 1 ? "just now" : `${minutesAgo} minute${minutesAgo !== 1 ? "s" : ""} ago`}
        </div>
      )}

      {error && (
        <Card className="shadow-sm border-rose-200">
          <CardContent className="p-6">
            <p className="text-sm text-rose-600">{error}</p>
            {error === "AI not configured" && (
              <p className="text-xs text-slate-500 mt-2">
                Add ANTHROPIC_API_KEY to your environment variables to enable AI insights.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {loading && !analysis && (
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
              <p className="text-sm text-slate-600">Analyzing your competitive landscape...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Competitive Intelligence Report
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm prose-slate max-w-none">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
