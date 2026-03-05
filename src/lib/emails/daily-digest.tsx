import * as React from "react";

interface PriceChange {
  productName: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  currency: string;
}

interface DailyDigestEmailProps {
  date: string;
  totalChecked: number;
  totalChanges: number;
  topChanges: PriceChange[];
  dashboardUrl: string;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
}

export function DailyDigestEmail({
  date,
  totalChecked,
  totalChanges,
  topChanges,
  dashboardUrl,
}: DailyDigestEmailProps) {
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
          <h1 style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", margin: "0 0 4px 0" }}>
            Daily Digest
          </h1>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 24px 0" }}>
            {date}
          </p>

          {/* Stats */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", textAlign: "center" as const }}>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b" }}>{totalChecked}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Checked</div>
            </div>
            <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", textAlign: "center" as const }}>
              <div style={{ fontSize: "24px", fontWeight: 700, color: totalChanges > 0 ? "#6366f1" : "#1e293b" }}>{totalChanges}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Changes</div>
            </div>
          </div>

          {/* Top Changes Table */}
          {topChanges.length > 0 && (
            <>
              <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", margin: "0 0 12px 0" }}>
                Biggest Price Changes
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    <th style={{ textAlign: "left" as const, padding: "8px 4px", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Product</th>
                    <th style={{ textAlign: "right" as const, padding: "8px 4px", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Old</th>
                    <th style={{ textAlign: "right" as const, padding: "8px 4px", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>New</th>
                    <th style={{ textAlign: "right" as const, padding: "8px 4px", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {topChanges.map((change, i) => {
                    const isDown = change.changePercent < 0;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 4px", fontSize: "13px", color: "#1e293b", fontWeight: 500 }}>
                          {change.productName}
                        </td>
                        <td style={{ padding: "8px 4px", fontSize: "13px", color: "#64748b", textAlign: "right" as const }}>
                          {formatPrice(change.oldPrice, change.currency)}
                        </td>
                        <td style={{ padding: "8px 4px", fontSize: "13px", color: "#1e293b", fontWeight: 600, textAlign: "right" as const }}>
                          {formatPrice(change.newPrice, change.currency)}
                        </td>
                        <td style={{
                          padding: "8px 4px",
                          fontSize: "13px",
                          fontWeight: 600,
                          textAlign: "right" as const,
                          color: isDown ? "#16a34a" : "#e11d48",
                        }}>
                          {change.changePercent > 0 ? "+" : ""}{change.changePercent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {topChanges.length === 0 && (
            <p style={{ fontSize: "14px", color: "#94a3b8", textAlign: "center" as const, margin: "0 0 24px 0" }}>
              No price changes detected in the last 24 hours.
            </p>
          )}

          {/* CTA */}
          <a
            href={dashboardUrl}
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
            View Dashboard
          </a>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 32px", borderTop: "1px solid #f1f5f9", backgroundColor: "#fafafa" }}>
          <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0, textAlign: "center" as const }}>
            You received this daily digest from WebSpy.{" "}
            <a href={`${dashboardUrl}/settings`} style={{ color: "#6366f1", textDecoration: "none" }}>
              Manage preferences
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function dailyDigestSubject(date: string): string {
  return `📊 WebSpy Daily Digest — ${date}`;
}
