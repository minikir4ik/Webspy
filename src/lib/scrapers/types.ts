export interface ScrapeResult {
  status: "success" | "failed";
  price?: number;
  originalPrice?: number;
  currency?: string;
  stockStatus?: "in_stock" | "out_of_stock" | "limited" | "unknown";
  stockQuantity?: number;
  productName?: string;
  confidence?: number;
  error?: string;
  rawData?: Record<string, unknown>;
}
