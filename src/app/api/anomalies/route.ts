import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ anomalies: [] });
  }

  const { data } = await supabase
    .from("anomalies")
    .select("*, tracked_products(product_name, project_id)")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("detected_at", { ascending: false })
    .limit(20);

  const anomalies = (data || []).map((a: Record<string, unknown>) => {
    const tp = a.tracked_products as Record<string, unknown> | null;
    return {
      ...a,
      product_name: tp?.product_name || "Product",
      project_id: tp?.project_id || "",
      tracked_products: undefined,
    };
  });

  return NextResponse.json({ anomalies });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  await supabase
    .from("anomalies")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
