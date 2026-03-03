import type { ScrapeResult } from "./types";

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  available: boolean;
  inventory_quantity?: number;
}

interface ShopifyProduct {
  product: {
    id: number;
    title: string;
    handle: string;
    variants: ShopifyVariant[];
  };
}

function extractHandleFromUrl(url: string): { domain: string; handle: string } | null {
  try {
    const parsed = new URL(url);
    const domain = `${parsed.protocol}//${parsed.hostname}`;
    // Match /products/{handle} or /products/{handle}/...
    const match = parsed.pathname.match(/\/products\/([^/?#]+)/);
    if (match) {
      return { domain, handle: match[1] };
    }
    return null;
  } catch {
    return null;
  }
}

export async function scrapeShopify(url: string): Promise<ScrapeResult> {
  const extracted = extractHandleFromUrl(url);
  if (!extracted) {
    return {
      status: "failed",
      error: "Could not extract product handle from URL",
    };
  }

  const { domain, handle } = extracted;
  const jsonUrl = `${domain}/products/${handle}.json`;

  let response: Response;
  try {
    response = await fetch(jsonUrl, {
      headers: {
        "User-Agent": "WebSpy/1.0 (Product Monitor)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    return {
      status: "failed",
      error: `Network error: ${err instanceof Error ? err.message : "Request failed"}`,
    };
  }

  if (response.status === 404) {
    return { status: "failed", error: "Product not found (404)" };
  }

  if (response.status === 429) {
    return { status: "failed", error: "Rate limited by Shopify (429)" };
  }

  if (!response.ok) {
    return { status: "failed", error: `HTTP ${response.status}` };
  }

  let data: ShopifyProduct;
  try {
    data = await response.json();
  } catch {
    return { status: "failed", error: "Invalid JSON response" };
  }

  if (!data.product || !data.product.variants || data.product.variants.length === 0) {
    return { status: "failed", error: "No product data in response" };
  }

  const product = data.product;
  const variants = product.variants;

  // Get the lowest price across all variants
  const prices = variants.map((v) => parseFloat(v.price)).filter((p) => !isNaN(p));
  const price = prices.length > 0 ? Math.min(...prices) : undefined;

  // Get compare_at_price (original/MSRP price)
  const compareAtPrices = variants
    .map((v) => (v.compare_at_price ? parseFloat(v.compare_at_price) : NaN))
    .filter((p) => !isNaN(p));
  const originalPrice = compareAtPrices.length > 0 ? Math.min(...compareAtPrices) : undefined;

  // Stock status: if ANY variant is available → in_stock
  const anyAvailable = variants.some((v) => v.available);
  const stockStatus = anyAvailable ? "in_stock" : "out_of_stock";

  // Sum inventory quantities if exposed
  let stockQuantity: number | undefined;
  const variantsWithInventory = variants.filter(
    (v) => typeof v.inventory_quantity === "number"
  );
  if (variantsWithInventory.length > 0) {
    stockQuantity = variantsWithInventory.reduce(
      (sum, v) => sum + (v.inventory_quantity ?? 0),
      0
    );
  }

  return {
    status: "success",
    price,
    originalPrice,
    currency: "USD",
    stockStatus,
    stockQuantity,
    productName: product.title,
    confidence: 1.0,
    rawData: data as unknown as Record<string, unknown>,
  };
}

/**
 * Check if a domain is a Shopify store by probing /products.json
 */
export async function isShopifyStore(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const domain = `${parsed.protocol}//${parsed.hostname}`;
    const response = await fetch(`${domain}/products.json?limit=1`, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
