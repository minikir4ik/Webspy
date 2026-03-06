import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";
import { NotificationToggles } from "@/components/settings/notification-toggles";
import { DeleteAccountButton } from "@/components/settings/delete-account-button";
import { BillingSection } from "@/components/settings/billing-section";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { User, Bell, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Profile, Plan } from "@/lib/types/database";

const planLabels: Record<string, { label: string; className: string }> = {
  free: { label: "Free", className: "bg-slate-100 text-slate-600" },
  starter: { label: "Starter", className: "bg-blue-50 text-blue-700" },
  pro: { label: "Pro", className: "bg-indigo-50 text-indigo-700" },
  business: { label: "Business", className: "bg-purple-50 text-purple-700" },
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const p = (profile as Profile | null) ?? {
    email: user.email || "",
    plan: "free" as const,
    email_notifications: true,
    daily_digest: true,
    created_at: user.created_at,
    stripe_customer_id: null,
    stripe_subscription_id: null,
  };

  // Get usage counts
  const [{ count: productCount }, { count: projectCount }] = await Promise.all([
    supabase
      .from("tracked_products")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const planKey = (p.plan || "free") as Plan;
  const plan = planLabels[planKey] || planLabels.free;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account, billing, and notification preferences.
        </p>
      </div>

      {/* Account */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
              <User className="h-4 w-4 text-indigo-600" />
            </div>
            <CardTitle className="text-base font-semibold text-slate-900">Account</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Email</span>
              <span className="text-sm font-medium text-slate-900">{p.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Plan</span>
              <Badge variant="secondary" className={`${plan.className} border-0`}>
                {plan.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Member since</span>
              <span className="text-sm text-slate-700">{formatDate(p.created_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <BillingSection
        plan={planKey}
        productCount={productCount ?? 0}
        projectCount={projectCount ?? 0}
        hasStripeCustomer={!!p.stripe_customer_id}
      />

      {/* Notification Preferences */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
              <Bell className="h-4 w-4 text-indigo-600" />
            </div>
            <CardTitle className="text-base font-semibold text-slate-900">Notification Preferences</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <NotificationToggles
            emailNotifications={p.email_notifications ?? true}
            dailyDigest={p.daily_digest ?? true}
          />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="shadow-sm border-rose-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <CardTitle className="text-base font-semibold text-rose-900">Danger Zone</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Delete Account</p>
              <p className="text-xs text-slate-500">Permanently delete your account and all data</p>
            </div>
            <DeleteAccountButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
