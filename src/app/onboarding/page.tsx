"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type AssetLink = { label: string; url: string };

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");

  // Step 3
  const [assets, setAssets] = useState<AssetLink[]>([]);

  function addAsset() {
    if (assets.length >= 5) return;
    setAssets([...assets, { label: "", url: "" }]);
  }

  function removeAsset(index: number) {
    setAssets(assets.filter((_, i) => i !== index));
  }

  function updateAsset(index: number, field: keyof AssetLink, value: string) {
    setAssets(assets.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  }

  function canAdvance(): boolean {
    if (step === 1) return fullName.trim() !== "" && phone.trim() !== "";
    if (step === 2) return brandName.trim() !== "";
    return true;
  }

  async function handleSubmit() {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      // 1. Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          onboarding_complete: true,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Insert brand
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .insert({
          name: brandName.trim(),
          website_url: websiteUrl.trim() || null,
          industry: industry.trim() || null,
          description: description.trim() || null,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (brandError) throw brandError;

      // 3. Insert brand assets
      const validAssets = assets.filter(
        (a) => a.label.trim() && a.url.trim()
      );
      if (validAssets.length > 0) {
        const { error: assetsError } = await supabase
          .from("brand_assets")
          .insert(
            validAssets.map((a) => ({
              brand_id: brand.id,
              asset_type: "link",
              label: a.label.trim(),
              url: a.url.trim(),
            }))
          );

        if (assetsError) throw assetsError;
      }

      // 4. Insert brand_volume with defaults
      const { error: volumeError } = await supabase
        .from("brand_volume")
        .insert({ brand_id: brand.id });

      if (volumeError) throw volumeError;

      // 5. Refresh profile and redirect
      await refreshProfile();
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s === step
                    ? "bg-accent text-cream"
                    : s < step
                      ? "bg-accent/20 text-accent"
                      : "bg-surface text-cream-31 border border-border"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-px ${
                    s < step ? "bg-accent/40" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card>
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display font-bold text-2xl text-cream mb-1">
                  Personal info
                </h1>
                <p className="text-cream-61 text-sm">
                  Tell us a bit about yourself.
                </p>
              </div>

              <Input
                label="Full name"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Phone number"
                type="tel"
                placeholder="+30 123 456 7890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          )}

          {/* Step 2: Brand Info */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display font-bold text-2xl text-cream mb-1">
                  Brand info
                </h1>
                <p className="text-cream-61 text-sm">
                  Tell us about your brand.
                </p>
              </div>

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
              <Input
                label="Industry"
                placeholder="e.g. Fashion, Food, Tech"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
              <Textarea
                label="Brand description"
                placeholder="A short description of your brand..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Step 3: Brand Assets */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display font-bold text-2xl text-cream mb-1">
                  Brand assets
                </h1>
                <p className="text-cream-61 text-sm">
                  Add links to your brand assets (logos, style guides, social
                  profiles). Up to 5 links.
                </p>
              </div>

              {assets.map((asset, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex-1 flex flex-col gap-2">
                    <Input
                      placeholder="Label (e.g. Logo)"
                      value={asset.label}
                      onChange={(e) => updateAsset(i, "label", e.target.value)}
                    />
                    <Input
                      placeholder="https://..."
                      type="url"
                      value={asset.url}
                      onChange={(e) => updateAsset(i, "url", e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAsset(i)}
                    className="mt-2 text-cream-31 hover:text-red-400 transition-colors text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {assets.length < 5 && (
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={addAsset}
                >
                  + Add link
                </Button>
              )}

              {assets.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-cream-31">
                  <span>Create Custom Brand (&euro;60)</span>
                  <Badge variant="warning">Coming Soon</Badge>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 mt-4">{error}</p>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <Button
                variant="ghost"
                type="button"
                onClick={() => setStep(step - 1)}
              >
                Previous
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                type="button"
                disabled={!canAdvance()}
                onClick={() => setStep(step + 1)}
              >
                Next
              </Button>
            ) : (
              <div className="flex gap-3">
                {assets.length === 0 && (
                  <Button
                    variant="ghost"
                    type="button"
                    loading={loading}
                    onClick={handleSubmit}
                  >
                    Skip for now
                  </Button>
                )}
                <Button
                  type="button"
                  loading={loading}
                  onClick={handleSubmit}
                >
                  Complete setup
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
