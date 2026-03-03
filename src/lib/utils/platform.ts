import type { Platform } from "@/lib/types/database";

/**
 * Detect platform from URL patterns.
 * - myshopify.com domains → shopify
 * - URLs with /products/ path → shopify (common Shopify pattern)
 * - amazon.com/amazon.co domains → amazon
 * - walmart.com → walmart
 * - Everything else → generic
 *
 * Note: The scraper router will further verify Shopify stores by
 * probing the /products.json endpoint at scrape time.
 */
export function detectPlatform(url: string): Platform {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // Explicit Shopify domains
    if (hostname.includes("myshopify.com")) {
      return "shopify";
    }

    // Amazon domains
    if (hostname.includes("amazon.com") || hostname.includes("amazon.co")) {
      return "amazon";
    }

    // Walmart domains
    if (hostname.includes("walmart.com")) {
      return "walmart";
    }

    // Heuristic: /products/{handle} is a strong Shopify signal
    if (/\/products\/[^/?#]+/.test(pathname)) {
      return "shopify";
    }

    return "generic";
  } catch {
    return "generic";
  }
}
