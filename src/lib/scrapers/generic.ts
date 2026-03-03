import type { ScrapeResult } from "./types";

function parsePrice(raw: string | undefined | null): number | undefined {
  if (!raw) return undefined;
  // Remove currency symbols and whitespace, handle comma as thousands separator
  const cleaned = raw.replace(/[^0-9.,]/g, "").trim();
  if (!cleaned) return undefined;

  // Handle formats: "1,299.99" or "1299.99" or "1299,99"
  let normalized: string;
  const commaIdx = cleaned.lastIndexOf(",");
  const dotIdx = cleaned.lastIndexOf(".");

  if (commaIdx > dotIdx) {
    // Comma is the decimal separator (European format: 1.299,99)
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // Dot is the decimal separator or no decimal (US format: 1,299.99)
    normalized = cleaned.replace(/,/g, "");
  }

  const num = parseFloat(normalized);
  return isNaN(num) ? undefined : num;
}

function mapAvailability(value: string | undefined | null): "in_stock" | "out_of_stock" | "unknown" {
  if (!value) return "unknown";
  const lower = value.toLowerCase();
  if (lower.includes("instock") || lower.includes("in_stock") || lower.includes("in stock")) {
    return "in_stock";
  }
  if (lower.includes("outofstock") || lower.includes("out_of_stock") || lower.includes("out of stock")) {
    return "out_of_stock";
  }
  return "unknown";
}

interface JsonLdResult {
  price?: number;
  originalPrice?: number;
  currency?: string;
  stockStatus?: "in_stock" | "out_of_stock" | "unknown";
  productName?: string;
}

function extractFromJsonLd(html: string): JsonLdResult | null {
  // Find all JSON-LD blocks
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        // Check for Product type
        if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) {
          const result: JsonLdResult = {};
          result.productName = item.name;

          // Offers can be a single object or an array
          const offers = item.offers;
          if (offers) {
            const offerList = Array.isArray(offers) ? offers : [offers];
            // Also handle AggregateOffer
            const allOffers: Record<string, unknown>[] = [];
            for (const o of offerList) {
              if (
                o["@type"] === "AggregateOffer" ||
                o["@type"]?.includes?.("AggregateOffer")
              ) {
                result.price = parsePrice(String(o.lowPrice ?? o.price ?? ""));
                result.originalPrice = parsePrice(String(o.highPrice ?? ""));
                result.currency = o.priceCurrency;
                result.stockStatus = mapAvailability(String(o.availability ?? ""));
              } else {
                allOffers.push(o);
              }
            }

            if (!result.price && allOffers.length > 0) {
              const first = allOffers[0];
              result.price = parsePrice(String(first.price ?? ""));
              result.currency = first.priceCurrency as string | undefined;
              result.stockStatus = mapAvailability(String(first.availability ?? ""));
            }
          }

          if (result.price !== undefined) {
            return result;
          }
        }

        // Check for Offer type directly
        if (item["@type"] === "Offer" || item["@type"]?.includes?.("Offer")) {
          const result: JsonLdResult = {};
          result.price = parsePrice(String(item.price ?? ""));
          result.currency = item.priceCurrency;
          result.stockStatus = mapAvailability(String(item.availability ?? ""));
          if (result.price !== undefined) {
            return result;
          }
        }
      }
    } catch {
      // Invalid JSON, skip this block
    }
  }

  return null;
}

interface OgResult {
  price?: number;
  currency?: string;
  stockStatus?: "in_stock" | "out_of_stock" | "unknown";
  productName?: string;
}

function extractFromOgTags(html: string): OgResult | null {
  const result: OgResult = {};

  function getMeta(property: string): string | null {
    // Match both property= and name= attributes
    const regex = new RegExp(
      `<meta[^>]*(?:property|name)\\s*=\\s*["']${property}["'][^>]*content\\s*=\\s*["']([^"']*)["']` +
        `|<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*(?:property|name)\\s*=\\s*["']${property}["']`,
      "i"
    );
    const match = regex.exec(html);
    return match ? (match[1] ?? match[2] ?? null) : null;
  }

  const price = getMeta("og:price:amount") ?? getMeta("product:price:amount");
  const currency = getMeta("og:price:currency") ?? getMeta("product:price:currency");
  const availability = getMeta("product:availability");
  const name = getMeta("og:title");

  if (price) {
    result.price = parsePrice(price);
    result.currency = currency ?? undefined;
    result.stockStatus = mapAvailability(availability);
    result.productName = name ?? undefined;
  }

  return result.price !== undefined ? result : null;
}

function extractFromMetaTags(html: string): { price?: number } | null {
  // Twitter card data
  const twitterMatch = html.match(
    /<meta[^>]*name\s*=\s*["']twitter:data1["'][^>]*content\s*=\s*["']([^"']*)["']/i
  );
  if (twitterMatch) {
    const price = parsePrice(twitterMatch[1]);
    if (price !== undefined) {
      return { price };
    }
  }
  return null;
}

export async function scrapeGeneric(url: string): Promise<ScrapeResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    return {
      status: "failed",
      error: `Network error: ${err instanceof Error ? err.message : "Request failed"}`,
    };
  }

  if (!response.ok) {
    return { status: "failed", error: `HTTP ${response.status}` };
  }

  let html: string;
  try {
    html = await response.text();
  } catch {
    return { status: "failed", error: "Failed to read response body" };
  }

  // Try JSON-LD first (highest confidence)
  const jsonLd = extractFromJsonLd(html);
  if (jsonLd && jsonLd.price !== undefined) {
    return {
      status: "success",
      price: jsonLd.price,
      originalPrice: jsonLd.originalPrice,
      currency: jsonLd.currency ?? "USD",
      stockStatus: jsonLd.stockStatus ?? "unknown",
      productName: jsonLd.productName,
      confidence: 1.0,
    };
  }

  // Try Open Graph tags (medium confidence)
  const og = extractFromOgTags(html);
  if (og && og.price !== undefined) {
    return {
      status: "success",
      price: og.price,
      currency: og.currency ?? "USD",
      stockStatus: og.stockStatus ?? "unknown",
      productName: og.productName,
      confidence: 0.7,
    };
  }

  // Try meta tags (low confidence)
  const meta = extractFromMetaTags(html);
  if (meta && meta.price !== undefined) {
    return {
      status: "success",
      price: meta.price,
      currency: "USD",
      stockStatus: "unknown",
      confidence: 0.4,
    };
  }

  return {
    status: "failed",
    error: "Could not extract price data from page",
  };
}
