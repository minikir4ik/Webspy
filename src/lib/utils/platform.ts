import type { Platform } from "@/lib/types/database";

export function detectPlatform(url: string): Platform {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (hostname.includes("myshopify.com") || hostname.endsWith(".myshopify.com")) {
      return "shopify";
    }

    if (hostname.includes("amazon.com") || hostname.includes("amazon.co")) {
      if (pathname.includes("/dp/") || pathname.includes("/gp/product/")) {
        return "amazon";
      }
      return "amazon";
    }

    if (hostname.includes("walmart.com")) {
      return "walmart";
    }

    return "generic";
  } catch {
    return "generic";
  }
}
