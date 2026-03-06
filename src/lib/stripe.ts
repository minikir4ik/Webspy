import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLANS = {
  free: { name: "Free", productLimit: 10, checkIntervalMinutes: 1440, projectLimit: 2 },
  starter: { name: "Starter", productLimit: 100, checkIntervalMinutes: 60, projectLimit: 10 },
  pro: { name: "Pro", productLimit: 500, checkIntervalMinutes: 15, projectLimit: 999 },
  business: { name: "Business", productLimit: 5000, checkIntervalMinutes: 5, projectLimit: 999 },
} as const;

export function getPlanFromPriceId(priceId: string): keyof typeof PLANS {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return "business";
  return "free";
}
