"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { detectPlatform } from "@/lib/utils/platform";
import type { ProductStatus } from "@/lib/types/database";

export async function addProduct(formData: FormData) {
  const projectId = formData.get("project_id") as string;
  const url = formData.get("url") as string;
  const productName = (formData.get("product_name") as string) || null;
  const myPriceStr = formData.get("my_price") as string;
  const myPrice = myPriceStr ? parseFloat(myPriceStr) : null;

  if (!projectId) {
    return { error: "Project ID is required" };
  }

  if (!url || url.trim().length === 0) {
    return { error: "Product URL is required" };
  }

  try {
    new URL(url.trim());
  } catch {
    return { error: "Please enter a valid URL" };
  }

  if (myPrice !== null && (isNaN(myPrice) || myPrice < 0)) {
    return { error: "Price must be a positive number" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Enforce product limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("product_limit")
    .eq("id", user.id)
    .single();

  const { count } = await supabase
    .from("tracked_products")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (profile && count !== null && count >= profile.product_limit) {
    return {
      error: `You've reached your limit of ${profile.product_limit} tracked products. Upgrade your plan to track more.`,
    };
  }

  const platform = detectPlatform(url.trim());

  const { data, error } = await supabase
    .from("tracked_products")
    .insert({
      project_id: projectId,
      user_id: user.id,
      url: url.trim(),
      platform,
      product_name: productName?.trim() || null,
      my_price: myPrice,
      status: "pending" as ProductStatus,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { data };
}

export async function updateProduct(
  productId: string,
  updates: {
    product_name?: string | null;
    my_price?: number | null;
    status?: ProductStatus;
    url?: string;
  }
) {
  if (!productId) {
    return { error: "Product ID is required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (updates.url) {
    try {
      new URL(updates.url.trim());
    } catch {
      return { error: "Please enter a valid URL" };
    }
  }

  if (updates.my_price !== undefined && updates.my_price !== null) {
    if (isNaN(updates.my_price) || updates.my_price < 0) {
      return { error: "Price must be a positive number" };
    }
  }

  const updateData: Record<string, unknown> = {};
  if (updates.product_name !== undefined)
    updateData.product_name = updates.product_name?.trim() || null;
  if (updates.my_price !== undefined) updateData.my_price = updates.my_price;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.url !== undefined) {
    updateData.url = updates.url.trim();
    updateData.platform = detectPlatform(updates.url.trim());
  }

  const { data, error } = await supabase
    .from("tracked_products")
    .update(updateData)
    .eq("id", productId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${data.project_id}`);
  return { data };
}

export async function deleteProduct(productId: string) {
  if (!productId) {
    return { error: "Product ID is required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the project_id before deleting for revalidation
  const { data: product } = await supabase
    .from("tracked_products")
    .select("project_id")
    .eq("id", productId)
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase
    .from("tracked_products")
    .delete()
    .eq("id", productId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  if (product) {
    revalidatePath(`/projects/${product.project_id}`);
  }
  revalidatePath("/projects");
  return { success: true };
}
