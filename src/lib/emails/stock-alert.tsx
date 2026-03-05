import * as React from "react";

interface StockAlertEmailProps {
  productName: string;
  productUrl: string;
  oldStatus: string;
  newStatus: string;
  currentPrice: string;
  productDetailUrl: string;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function StockAlertEmail({
  productName,
  productUrl,
  oldStatus,
  newStatus,
  currentPrice,
  productDetailUrl,
}: StockAlertEmailProps) {
  const isBackInStock = newStatus === "in_stock";

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
            Stock Alert
          </h1>

          <p style={{ fontSize: "14px", color: "#475569", lineHeight: "1.6", margin: "0 0 24px 0" }}>
            <strong>{productName}</strong> stock status changed.
          </p>

          {/* Status Change Card */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginBottom: "12px" }}>
              {productName}
            </div>
            <a href={productUrl} style={{ fontSize: "12px", color: "#6366f1", textDecoration: "none" }}>
              {productUrl}
            </a>

            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: 500,
                backgroundColor: "#fee2e2",
                color: "#991b1b",
              }}>
                {formatStatus(oldStatus)}
              </div>
              <span style={{ color: "#94a3b8", fontSize: "16px" }}>→</span>
              <div style={{
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: 500,
                backgroundColor: isBackInStock ? "#dcfce7" : "#fef3c7",
                color: isBackInStock ? "#166534" : "#92400e",
              }}>
                {formatStatus(newStatus)}
              </div>
            </div>

            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Current Price</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>{currentPrice}</div>
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

export function stockAlertSubject(productName: string, newStatus: string): string {
  const statusText = newStatus === "out_of_stock" ? "Out of Stock" : "Back in Stock";
  return `⚠️ Stock Alert: ${productName} is now ${statusText}`;
}
