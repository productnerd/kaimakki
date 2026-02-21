"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type BrandAsset = {
  id: string;
  label: string;
  url: string;
  asset_type: string;
};

type BrandVolume = {
  lifetime_video_count: number;
  lifetime_spent_cents: number;
  lifetime_saved_cents: number;
  current_discount_percent: number;
};

type Brand = {
  id: string;
  name: string;
  website_url: string | null;
  brand_assets: BrandAsset[];
  brand_volume: BrandVolume[] | BrandVolume | null;
};

type DiscountTier = {
  id: string;
  slug: string;
  name: string;
  min_video_count: number;
  discount_percent: number;
};

export default function BrandPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [tiers, setTiers] = useState<DiscountTier[]>([]);
  const [loading, setLoading] = useState(true);

  // Brand info form
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  // Add asset form
  const [newAssetLabel, setNewAssetLabel] = useState("");
  const [newAssetUrl, setNewAssetUrl] = useState("");
  const [addingAsset, setAddingAsset] = useState(false);

  useEffect(() => {
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchData() {
    setLoading(true);

    const [brandResult, tiersResult] = await Promise.all([
      supabase
        .from("brands")
        .select("*, brand_assets(*), brand_volume(*)")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("discount_tiers")
        .select("*")
        .order("min_video_count", { ascending: true }),
    ]);

    if (brandResult.data) {
      const b = brandResult.data as Brand;
      setBrand(b);
      setName(b.name);
      setWebsiteUrl(b.website_url ?? "");
    }

    if (tiersResult.data) {
      setTiers(tiersResult.data as DiscountTier[]);
    }

    setLoading(false);
  }

  const volume: BrandVolume | null = brand
    ? Array.isArray(brand.brand_volume)
      ? brand.brand_volume[0] ?? null
      : brand.brand_volume
    : null;

  // --- Brand Info ---

  async function handleSaveBrand() {
    if (!brand || !name.trim()) return;
    setSaving(true);
    setError("");
    setSaveSuccess(false);

    const { error: updateError } = await supabase
      .from("brands")
      .update({
        name: name.trim(),
        website_url: websiteUrl.trim() || null,
      })
      .eq("id", brand.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setSaving(false);
  }

  // --- Brand Assets ---

  async function handleAddAsset() {
    if (!brand || !newAssetLabel.trim() || !newAssetUrl.trim()) return;
    if (brand.brand_assets.length >= 5) return;
    setAddingAsset(true);

    const { data, error: insertError } = await supabase
      .from("brand_assets")
      .insert({
        brand_id: brand.id,
        asset_type: "link",
        label: newAssetLabel.trim(),
        url: newAssetUrl.trim(),
      })
      .select()
      .single();

    if (!insertError && data) {
      setBrand({
        ...brand,
        brand_assets: [...brand.brand_assets, data as BrandAsset],
      });
      setNewAssetLabel("");
      setNewAssetUrl("");
    }
    setAddingAsset(false);
  }

  async function handleRemoveAsset(assetId: string) {
    if (!brand) return;

    const { error: deleteError } = await supabase
      .from("brand_assets")
      .delete()
      .eq("id", assetId);

    if (!deleteError) {
      setBrand({
        ...brand,
        brand_assets: brand.brand_assets.filter((a) => a.id !== assetId),
      });
    }
  }

  // --- Tier helpers ---

  function getCurrentTierIndex(): number {
    if (!volume) return -1;
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (volume.lifetime_video_count >= tiers[i].min_video_count) return i;
    }
    return -1;
  }

  const currentTierIndex = getCurrentTierIndex();
  const nextTier =
    currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
  const videosToNextTier =
    nextTier && volume
      ? nextTier.min_video_count - volume.lifetime_video_count
      : 0;

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-6">
        <p className="text-cream-61">No brand found. Complete onboarding first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <h1 className="font-display font-bold text-3xl text-cream">
          Brand Management
        </h1>

        {/* Section 1: Brand Info */}
        <Card>
          <div className="flex flex-col gap-5">
            <h2 className="font-display font-semibold text-xl text-cream">
              Brand Info
            </h2>

            <Input
              label="Brand name"
              placeholder="Your brand name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Website URL"
              type="url"
              placeholder="https://yourbrand.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            {saveSuccess && (
              <p className="text-sm text-green-400">Changes saved.</p>
            )}

            <div>
              <Button
                loading={saving}
                disabled={!name.trim()}
                onClick={handleSaveBrand}
              >
                Save changes
              </Button>
            </div>
          </div>
        </Card>

        {/* Section 2: Brand Assets */}
        <Card>
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-xl text-cream">
                Brand Assets
              </h2>
              <span className="text-sm text-cream-61">
                {brand.brand_assets.length}/5 assets
              </span>
            </div>

            {brand.brand_assets.length > 0 ? (
              <div className="flex flex-col gap-3">
                {brand.brand_assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-3 p-3 bg-background rounded-brand border border-border"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-cream truncate">
                        {asset.label}
                      </p>
                      <p className="text-xs text-cream-31 truncate">
                        {asset.url}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(asset.id)}
                      className="text-cream-31 hover:text-red-400 transition-colors text-sm shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-cream-31">
                <span>No assets yet.</span>
                <button
                  type="button"
                  onClick={() =>
                    alert("Coming soon")
                  }
                  className="inline-flex items-center gap-1.5"
                >
                  <span className="text-cream-61">
                    Create Custom Brand (&euro;60)
                  </span>
                  <Badge variant="warning">Coming Soon</Badge>
                </button>
              </div>
            )}

            {brand.brand_assets.length < 5 && (
              <div className="flex gap-3 items-end">
                <div className="flex-1 flex flex-col gap-2">
                  <Input
                    placeholder="Label (e.g. Logo)"
                    value={newAssetLabel}
                    onChange={(e) => setNewAssetLabel(e.target.value)}
                  />
                  <Input
                    placeholder="https://..."
                    type="url"
                    value={newAssetUrl}
                    onChange={(e) => setNewAssetUrl(e.target.value)}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={addingAsset}
                  disabled={!newAssetLabel.trim() || !newAssetUrl.trim()}
                  onClick={handleAddAsset}
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Section 3: Volume Tier Progress */}
        <Card>
          <div className="flex flex-col gap-5">
            <h2 className="font-display font-semibold text-xl text-cream">
              Volume Tier Progress
            </h2>

            {volume ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-background rounded-brand border border-border">
                    <p className="text-xs text-cream-31 mb-1">Videos ordered</p>
                    <p className="text-xl font-semibold text-cream">
                      {volume.lifetime_video_count}
                    </p>
                  </div>
                  <div className="p-4 bg-background rounded-brand border border-border">
                    <p className="text-xs text-cream-31 mb-1">Current discount</p>
                    <p className="text-xl font-semibold text-accent">
                      {volume.current_discount_percent}%
                    </p>
                  </div>
                  <div className="p-4 bg-background rounded-brand border border-border">
                    <p className="text-xs text-cream-31 mb-1">Total spent</p>
                    <p className="text-xl font-semibold text-cream">
                      &euro;{(volume.lifetime_spent_cents / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-background rounded-brand border border-border">
                    <p className="text-xs text-cream-31 mb-1">Total saved</p>
                    <p className="text-xl font-semibold text-green-400">
                      &euro;{(volume.lifetime_saved_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Tier badges */}
                {tiers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tiers.map((tier, i) => (
                      <Badge
                        key={tier.id}
                        variant={
                          i === currentTierIndex
                            ? "accent"
                            : i < currentTierIndex
                              ? "success"
                              : "default"
                        }
                      >
                        {tier.name} ({tier.discount_percent}%)
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Next tier message */}
                {nextTier && (
                  <p className="text-sm text-cream-61">
                    {videosToNextTier} more video{videosToNextTier !== 1 ? "s" : ""}{" "}
                    to unlock{" "}
                    <span className="text-accent font-medium">
                      {nextTier.discount_percent}% off
                    </span>{" "}
                    ({nextTier.name})
                  </p>
                )}

                {!nextTier && currentTierIndex >= 0 && (
                  <p className="text-sm text-green-400">
                    You&apos;ve reached the highest tier!
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-cream-31">
                No volume data available yet. Place your first order to start
                tracking.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
