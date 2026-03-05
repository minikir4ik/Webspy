import * as React from "react";

interface PriceAlertEmailProps {
  productName: string;
  productUrl: string;
  alertMessage: string;
  currentPrice: string;
  stockStatus: string | null;
  productDetailUrl: string;
}

export function PriceAlertEmail({
  productName,
  productUrl,
  alertMessage,
  currentPrice,
  stockStatus,
  productDetailUrl,
}: PriceAlertEmailProps) {
  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", backgroundColor: "#f8f9fa", padding: "40px 0" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", padding: "24px 32px", textAlign: "center" as const }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>
            WebSpy
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "32px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", margin: "0 0 16px 0" }}>
            Price Alert
          </h1>

          <p style={{ fontSize: "14px", color: "#475569", lineHeight: "1.6", margin: "0 0 24px 0" }}>
            {alertMessage}
          </p>

          {/* Product Card */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
              {productName}
            </div>
            <a href={productUrl} style={{ fontSize: "12px", color: "#6366f1", textDecoration: "none" }}>
              {productUrl}
            </a>

            <div style={{ marginTop: "16px", display: "flex", gap: "24px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Current Price</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b" }}>{currentPrice}</div>
              </div>
              {stockStatus && (
                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Stock</div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#475569", marginTop: "4px" }}>
                    {stockStatus.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <a
            href={productDetailUrl}
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              padding: "10px 24px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            View in WebSpy
          </a>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 32px", borderTop: "1px solid #f1f5f9", backgroundColor: "#fafafa" }}>
          <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0, textAlign: "center" as const }}>
            You received this because you have alert rules configured in WebSpy.{" "}
            <a href={`${productDetailUrl.split("/projects")[0]}/settings`} style={{ color: "#6366f1", textDecoration: "none" }}>
              Manage preferences
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function priceAlertSubject(productName: string, ruleType: string): string {
  const descriptions: Record<string, string> = {
    price_drop_percent: "Price Dropped",
    price_drop_absolute: "Price Dropped",
    price_below: "Price Below Threshold",
    price_above: "Price Above Threshold",
    price_increases: "Price Increased",
    competitor_undercuts_me: "Competitor Undercut",
  };
  const desc = descriptions[ruleType] || "Price Change";
  return `🔔 Price Alert: ${productName} — ${desc}`;
}
