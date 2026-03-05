"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateNotificationPreferences(formData: FormData) {
  const emailNotifications = formData.get("email_notifications") === "true";
  const dailyDigest = formData.get("daily_digest") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      email_notifications: emailNotifications,
      daily_digest: dailyDigest,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Delete user's data in order (respecting foreign keys)
  const tables = ["alert_history", "alert_rules", "price_checks", "tracked_products", "projects", "profiles"];
  for (const table of tables) {
    await supabase.from(table).delete().eq("user_id", user.id);
  }

  // Sign out
  await supabase.auth.signOut();

  return { success: true };
}
