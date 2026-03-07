import { createClient } from "@/lib/supabase/server";
import { ComparePageClient } from "@/components/compare/compare-page-client";
import type { TrackedProduct, PriceCheck, SavedComparison } from "@/lib/types/database";

interface ComparePageProps {
  searchParams: Promise<{ products?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { products: productIdsParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get all user's products for selection
  const { data: allProducts } = await supabase
    .from("tracked_products")
    .select("*")
    .eq("user_id", user.id)
    .order("product_name", { ascending: true });

  const products = (allProducts as TrackedProduct[] | null) ?? [];

  // If product IDs were provided, fetch their price history
  let selectedProducts: TrackedProduct[] = [];
  let priceHistories: Record<string, PriceCheck[]> = {};

  if (productIdsParam) {
    const ids = productIdsParam.split(",").filter(Boolean);
    selectedProducts = products.filter((p) => ids.includes(p.id));

    if (selectedProducts.length > 0) {
      const { data: checks } = await supabase
        .from("price_checks")
        .select("*")
        .in("product_id", selectedProducts.map((p) => p.id))
        .order("checked_at", { ascending: true });

      if (checks) {
        for (const check of checks as PriceCheck[]) {
          if (!priceHistories[check.product_id]) {
            priceHistories[check.product_id] = [];
          }
          priceHistories[check.product_id].push(check);
        }
      }
    }
  }

  // Fetch saved comparisons
  let savedComparisons: SavedComparison[] = [];
  try {
    const { data } = await supabase
      .from("saved_comparisons")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    savedComparisons = (data as SavedComparison[] | null) ?? [];
  } catch {
    // Table may not exist yet
  }

  return (
    <ComparePageClient
      allProducts={products}
      initialSelected={selectedProducts}
      priceHistories={priceHistories}
      savedComparisons={savedComparisons}
    />
  );
}
