"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type Brand = {
  id: string;
  name: string;
  website_url: string | null;
};

export default function SettingsPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Brand info
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandSuccess, setBrandSuccess] = useState(false);
  const [brandError, setBrandError] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("brands")
      .select("id, name, website_url")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBrand(data);
          setBrandName(data.name);
          setWebsiteUrl(data.website_url ?? "");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

    await supabase
      .from("profiles")
      .update({ full_name: name, phone })
      .eq("id", user!.id);

    await refreshProfile();
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function handleSaveBrand() {
    if (!brand || !brandName.trim()) return;
    setSavingBrand(true);
    setBrandError("");
    setBrandSuccess(false);

    const { error: updateError } = await supabase
      .from("brands")
      .update({
        name: brandName.trim(),
        website_url: websiteUrl.trim() || null,
      })
      .eq("id", brand.id);

    if (updateError) {
      setBrandError(updateError.message);
    } else {
      setBrandSuccess(true);
      setTimeout(() => setBrandSuccess(false), 3000);
    }
    setSavingBrand(false);
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-8">
      <Card>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <h2 className="font-display font-semibold text-xl text-cream">
            Account
          </h2>

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

      {brand && (
        <Card>
          <div className="flex flex-col gap-5">
            <h2 className="font-display font-semibold text-xl text-cream">
              Brand Info
            </h2>

            <Input
              label="Brand name"
              placeholder="Your brand name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              required
            />
            <Input
              label="Website URL"
              type="url"
              placeholder="https://yourbrand.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />

            {brandError && <p className="text-sm text-red-400">{brandError}</p>}

            {brandSuccess && (
              <p className="text-sm text-green-400">Changes saved.</p>
            )}

            <div>
              <Button
                loading={savingBrand}
                disabled={!brandName.trim()}
                onClick={handleSaveBrand}
              >
                Save changes
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
