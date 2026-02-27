"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type BrandAsset = {
  id: string;
  label: string;
  url: string;
  asset_type: string;
};

type Brand = {
  id: string;
  name: string;
  broll_folder_url: string | null;
  content_strategy: string | null;
  strategy_document_url: string | null;
  brand_assets: BrandAsset[];
};

export default function BrandAssetsPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  // B-roll folder
  const [brollUrl, setBrollUrl] = useState("");
  const [savingBroll, setSavingBroll] = useState(false);
  const [brollSuccess, setBrollSuccess] = useState(false);

  // Add asset form
  const [newAssetLabel, setNewAssetLabel] = useState("");
  const [newAssetUrl, setNewAssetUrl] = useState("");
  const [addingAsset, setAddingAsset] = useState(false);

  // Content strategy
  const [strategyText, setStrategyText] = useState("");
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [strategySuccess, setStrategySuccess] = useState(false);
  const [strategyDocName, setStrategyDocName] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchData() {
    setLoading(true);

    const { data: brandResult } = await supabase
      .from("brands")
      .select("id, name, broll_folder_url, content_strategy, strategy_document_url, brand_assets(*)")
      .eq("user_id", user!.id)
      .limit(1)
      .maybeSingle();

    if (brandResult) {
      const b = brandResult as Brand;
      setBrand(b);
      setBrollUrl(b.broll_folder_url ?? "");
      setStrategyText(b.content_strategy ?? "");
      if (b.strategy_document_url) {
        // Extract filename from path
        const parts = b.strategy_document_url.split("/");
        setStrategyDocName(parts[parts.length - 1] ?? "document");
      }
    }

    setLoading(false);
  }

  async function handleSaveBroll() {
    if (!brand) return;
    setSavingBroll(true);
    setBrollSuccess(false);

    await supabase
      .from("brands")
      .update({ broll_folder_url: brollUrl.trim() || null })
      .eq("id", brand.id);

    setBrollSuccess(true);
    setTimeout(() => setBrollSuccess(false), 3000);
    setSavingBroll(false);
  }

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

  async function handleSaveStrategy() {
    if (!brand) return;
    setSavingStrategy(true);
    setStrategySuccess(false);

    await supabase
      .from("brands")
      .update({ content_strategy: strategyText.trim() || null })
      .eq("id", brand.id);

    setStrategySuccess(true);
    setTimeout(() => setStrategySuccess(false), 3000);
    setSavingStrategy(false);
  }

  async function handleUploadDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !brand) return;
    setUploadingDoc(true);

    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${user.id}/${Date.now()}.${ext}`;

    // Remove old file if exists
    if (brand.strategy_document_url) {
      await supabase.storage.from("strategy-docs").remove([brand.strategy_document_url]);
    }

    const { error: uploadError } = await supabase.storage
      .from("strategy-docs")
      .upload(path, file);

    if (!uploadError) {
      await supabase
        .from("brands")
        .update({ strategy_document_url: path })
        .eq("id", brand.id);

      setBrand({ ...brand, strategy_document_url: path });
      setStrategyDocName(file.name);
    }

    setUploadingDoc(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemoveDoc() {
    if (!brand?.strategy_document_url) return;

    await supabase.storage.from("strategy-docs").remove([brand.strategy_document_url]);
    await supabase
      .from("brands")
      .update({ strategy_document_url: null })
      .eq("id", brand.id);

    setBrand({ ...brand, strategy_document_url: null });
    setStrategyDocName(null);
  }

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
        {/* B-roll Folder */}
        <Card>
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-display font-semibold text-xl text-cream">
                B-roll Folder
              </h2>
              <p className="text-cream-31 text-sm mt-1">
                Share a link to your raw footage (Google Drive, Dropbox, etc.) so we can grab what we need.
              </p>
            </div>

            <Input
              label="Folder URL"
              type="url"
              placeholder="https://drive.google.com/drive/folders/..."
              value={brollUrl}
              onChange={(e) => setBrollUrl(e.target.value)}
            />

            <div className="flex items-center gap-3">
              <Button
                loading={savingBroll}
                onClick={handleSaveBroll}
              >
                Save
              </Button>
              {brollSuccess && (
                <p className="text-sm text-green-400">Saved.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Brand Assets */}
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

        {/* Content Strategy */}
        <Card>
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-display font-semibold text-xl text-cream">
                Content Strategy
              </h2>
              <p className="text-cream-31 text-sm mt-1">
                Tell us what you post about, your style, topics, audience — anything that helps us nail your vibe.
              </p>
            </div>

            <Textarea
              label="Your strategy, notes, or anything we should know"
              placeholder="E.g. I post 3x/week about personal finance for millennials. Tone is casual and slightly sarcastic. I never use stock footage..."
              rows={6}
              value={strategyText}
              onChange={(e) => setStrategyText(e.target.value)}
            />

            {/* Document upload */}
            <div className="border-t border-border pt-4">
              <p className="text-sm text-cream-61 mb-3">
                Or upload a strategy document (PDF, DOCX, TXT — max 10MB)
              </p>

              {strategyDocName ? (
                <div className="flex items-center justify-between gap-3 p-3 bg-background rounded-brand border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">📄</span>
                    <p className="text-sm text-cream truncate">{strategyDocName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveDoc}
                    className="text-cream-31 hover:text-red-400 transition-colors text-sm shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleUploadDoc}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={uploadingDoc}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload document
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                loading={savingStrategy}
                onClick={handleSaveStrategy}
              >
                Save
              </Button>
              {strategySuccess && (
                <p className="text-sm text-green-400">Saved.</p>
              )}
            </div>

            {/* Content Strategy Pack CTA */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-cream">Content Strategy Pack</h3>
                    <Badge>Coming Soon</Badge>
                  </div>
                  <p className="text-cream-31 text-xs">
                    We&apos;ll build you a full content strategy — topics, formats, posting schedule, the works.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stylistic Preferences */}
        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-xl text-cream">
                  Stylistic Preferences
                </h2>
                <p className="text-cream-31 text-sm mt-1">
                  Colors, fonts, transitions, pacing — your visual fingerprint.
                </p>
              </div>
              <Badge>Coming Soon</Badge>
            </div>
            <div className="border border-dashed border-border rounded-brand p-8 text-center">
              <p className="text-cream-31 text-sm">
                Soon you&apos;ll be able to set your editing preferences here so every video feels like yours.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
