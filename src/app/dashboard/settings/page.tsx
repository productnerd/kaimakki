"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function SettingsPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !profile) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ full_name: name, phone })
      .eq("id", user!.id);

    await refreshProfile();
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-display font-black text-3xl text-cream mb-8">
        Account Settings
      </h1>

      <Card>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <Input
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your full name"
          />

          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your phone number"
            type="tel"
          />

          <Input
            label="Email"
            value={profile.email}
            disabled
            className="opacity-60 cursor-not-allowed"
          />

          <div className="flex items-center gap-4 pt-2">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>

            {success && (
              <span className="text-sm text-green-400">Changes saved</span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
