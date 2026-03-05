"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateNotificationPreferences } from "@/lib/actions/settings";

interface NotificationTogglesProps {
  emailNotifications: boolean;
  dailyDigest: boolean;
}

export function NotificationToggles({
  emailNotifications: initialEmail,
  dailyDigest: initialDigest,
}: NotificationTogglesProps) {
  const [emailNotifications, setEmailNotifications] = useState(initialEmail);
  const [dailyDigest, setDailyDigest] = useState(initialDigest);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const formData = new FormData();
    formData.set("email_notifications", String(emailNotifications));
    formData.set("daily_digest", String(dailyDigest));
    const result = await updateNotificationPreferences(formData);
    setSaving(false);
    if (!result.error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">Email Notifications</p>
          <p className="text-xs text-slate-500">Receive alert emails when rules trigger</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={emailNotifications}
          onClick={() => setEmailNotifications(!emailNotifications)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            emailNotifications ? "bg-indigo-600" : "bg-slate-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              emailNotifications ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </label>

      <label className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">Daily Digest</p>
          <p className="text-xs text-slate-500">Receive a daily summary of price changes at 8 AM UTC</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={dailyDigest}
          onClick={() => setDailyDigest(!dailyDigest)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            dailyDigest ? "bg-indigo-600" : "bg-slate-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              dailyDigest ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg gradient-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">Saved!</span>
        )}
      </div>
    </div>
  );
}
