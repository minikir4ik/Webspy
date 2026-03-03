import type { ScrapeResult } from "./types";
import { scrapeShopify, isShopifyStore } from "./shopify";
import { scrapeGeneric } from "./generic";

/**
 * Routes scraping to the correct extractor based on platform hint.
 * Also performs smart detection — if a URL has /products/ path and
 * the store responds to Shopify's JSON API, we use the Shopify extractor.
 */
export async function scrapeProduct(
  url: string,
  platform: string
): Promise<ScrapeResult> {
  console.log(`[scraper] Routing: url=${url}, platform=${platform}`);

  try {
    // Direct routing for known platforms
    if (platform === "shopify") {
      console.log("[scraper] Using Shopify extractor");
      const result = await scrapeShopify(url);
      console.log(`[scraper] Shopify result: status=${result.status}, error=${result.error ?? "none"}`);
      return result;
    }

    // Smart detection: URLs with /products/ might be Shopify
    if (platform === "generic" && url.includes("/products/")) {
      console.log("[scraper] Probing for Shopify store...");
      const shopify = await isShopifyStore(url);
      if (shopify) {
        console.log("[scraper] Confirmed Shopify store, using Shopify extractor");
        return scrapeShopify(url);
      }
      console.log("[scraper] Not a Shopify store, falling back to generic");
    }

    // Amazon and Walmart would need their own extractors (Keepa API, etc.)
    // For now, fall back to generic for these
    console.log("[scraper] Using generic extractor");
    const result = await scrapeGeneric(url);
    console.log(`[scraper] Generic result: status=${result.status}, error=${result.error ?? "none"}`);
    return result;
  } catch (err) {
    console.error("[scraper] Unhandled error in router:", err);
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "Scraper crashed",
    };
  }
}
