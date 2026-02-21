"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import PhoneCodeSelect from "@/components/ui/PhoneCodeSelect";

const SOCIAL_CHANNELS = [
  {
    id: "instagram",
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.16v-3.45a4.85 4.85 0 01-2.65-.78 4.83 4.83 0 01-1.35-1.24V6.69h3z" />
      </svg>
    ),
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    id: "x",
    label: "X (Twitter)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: "pinterest",
    label: "Pinterest",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
      </svg>
    ),
  },
  {
    id: "snapchat",
    label: "Snapchat",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.959-.289.158-.089.29-.137.4-.137.126 0 .255.053.389.161.24.19.339.455.255.706-.09.266-.36.456-.72.576-.07.025-.173.065-.29.107-.346.123-.89.315-1.106.606-.07.095-.1.19-.09.31.01.165.09.34.21.51.36.48.76.9 1.2 1.26.44.36.92.65 1.44.84.275.1.47.24.525.39.045.12.02.28-.09.41-.39.45-1.2.54-1.5.57-.06.006-.12.014-.17.024-.135.03-.27.09-.42.24-.135.135-.21.3-.33.57-.12.27-.24.56-.48.78-.27.24-.56.24-.75.24-.12 0-.24-.015-.37-.045-.39-.09-.81-.18-1.14-.18-.15 0-.3.015-.45.06-.795.24-1.5.93-2.37 1.74-.525.48-1.065.975-1.665 1.395-.6.42-1.305.72-2.085.72h-.03c-.78 0-1.485-.3-2.085-.72-.6-.42-1.14-.915-1.665-1.395-.87-.81-1.575-1.5-2.37-1.74a2.1 2.1 0 00-.45-.06c-.33 0-.75.09-1.14.18a2.1 2.1 0 01-.37.045c-.165 0-.48 0-.75-.24-.24-.225-.36-.51-.48-.78-.12-.27-.195-.435-.33-.57-.15-.15-.285-.21-.42-.24-.06-.01-.11-.018-.17-.024-.3-.03-1.11-.12-1.5-.57-.11-.13-.135-.29-.09-.41.055-.15.25-.29.525-.39.525-.19 1-.48 1.44-.84.44-.36.84-.78 1.2-1.26.12-.17.2-.345.21-.51.01-.12-.02-.215-.09-.31-.216-.291-.76-.483-1.106-.606a3.7 3.7 0 01-.29-.107c-.36-.12-.63-.31-.72-.576-.084-.251.015-.516.255-.706.135-.108.264-.161.39-.161.11 0 .242.048.4.137.3.169.66.273.96.289.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.3-4.847C5.653 1.069 9.01.793 10 .793h.012z" />
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+30");
  const [phoneNumber, setPhoneNumber] = useState("");
  const phone = `${countryCode} ${phoneNumber}`.trim();

  // Step 2
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [channels, setChannels] = useState<string[]>([]);

  function toggleChannel(id: string) {
    setChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function canAdvance(): boolean {
    if (step === 1) return name.trim() !== "" && phoneNumber.trim() !== "";
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
          full_name: name.trim(),
          phone: phone.trim(),
          onboarding_complete: true,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Check for existing brand (from a previous partial attempt)
      const { data: existingBrand } = await supabase
        .from("brands")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      let brandId: string;

      if (existingBrand) {
        // Update existing brand
        await supabase
          .from("brands")
          .update({
            name: brandName.trim(),
            website_url: websiteUrl.trim() || null,
            social_channels: channels,
          })
          .eq("id", existingBrand.id);
        brandId = existingBrand.id;
      } else {
        // Insert new brand
        const { data: brand, error: brandError } = await supabase
          .from("brands")
          .insert({
            name: brandName.trim(),
            website_url: websiteUrl.trim() || null,
            social_channels: channels,
            user_id: user.id,
          })
          .select("id")
          .single();

        if (brandError) throw brandError;
        brandId = brand.id;
      }

      // 3. Upsert brand_volume with defaults
      const { error: volumeError } = await supabase
        .from("brand_volume")
        .upsert({ brand_id: brandId }, { onConflict: "brand_id" });

      if (volumeError) throw volumeError;

      // 4. Refresh profile and redirect
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
    <div className="h-full bg-background flex items-start justify-center px-6 pt-6 pb-6 overflow-hidden">
      <div className="max-w-xl w-full">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
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
              {s < 2 && (
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
                label="Name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-cream mb-1.5">
                  Phone number
                </label>
                <div className="flex gap-2">
                  <PhoneCodeSelect
                    value={countryCode}
                    onChange={setCountryCode}
                  />
                  <Input
                    type="tel"
                    placeholder="123 456 7890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
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

              {/* Social channels */}
              <div>
                <label className="block text-sm font-medium text-cream mb-3">
                  Social channels
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SOCIAL_CHANNELS.map((ch) => {
                    const active = channels.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => toggleChannel(ch.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-brand border text-sm font-medium transition-all duration-150 ${
                          active
                            ? "border-accent bg-accent/10 text-cream"
                            : "border-border bg-surface text-cream-31 hover:text-cream-61 hover:border-border"
                        }`}
                      >
                        <span className={active ? "text-accent" : "text-cream-31"}>
                          {ch.icon}
                        </span>
                        {ch.label}
                      </button>
                    );
                  })}
                </div>
              </div>
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

            {step < 2 ? (
              <Button
                type="button"
                disabled={!canAdvance()}
                onClick={() => setStep(step + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                loading={loading}
                disabled={!canAdvance()}
                onClick={handleSubmit}
              >
                Complete setup
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
