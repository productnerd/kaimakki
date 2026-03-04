"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { useCart } from "@/providers/CartProvider";
import { type UnlockState, type Milestone, getAddonUnlockMilestone, getEffectiveDuration, getTierIndex } from "@/lib/unlocks";

type Recipe = {
  id: string;
  slug: string;
  name: string;
  description: string;
  filming_difficulty: string;
  editing_difficulty: string;
  price_cents: number;
  turnaround_days: number;
  base_output_seconds: number;
  intake_form_schema: { fields: { name: string; label: string; type: string; required?: boolean; mode?: string; weHandleLabel?: string }[] };
  deliverables_description: string[];
  creative_surcharge_percent: number;
  example_urls: string[];
};

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  userDiscountPct?: number;
  unlockState?: UnlockState | null;
  milestones?: Milestone[];
}

const EXTRAS = [
  { key: "needs_additional_format", label: "Additional aspect ratio", sublabel: "e.g. 9:16 + 16:9", price: 20, addonKey: null },
  { key: "needs_stock_footage", label: "Stock footage", sublabel: "We source relevant b-roll", price: 15, addonKey: "stock_footage" },
  { key: "needs_ai_voice", label: "AI voiceover", sublabel: "Natural-sounding narration", price: 25, addonKey: "ai_voice" },
  { key: "needs_expedited", label: "Expedited delivery", sublabel: "Rush it — 2 business days", price: 40, addonKey: "expedited" },
] as const;

function getExampleEmbedUrl(url: string): string {
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^/?]+)/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=0&mute=1&loop=1&controls=0&playlist=${shortsMatch[1]}`;
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=0&mute=1&controls=0`;
  if (url.includes("instagram.com/reel/") || url.includes("instagram.com/p/")) return `${url.replace(/\/?$/, "/embed/")}`;
  return url;
}

export default function RecipeDetailModal({ recipe, onClose, userDiscountPct = 0, unlockState, milestones = [] }: RecipeDetailModalProps) {
  const { addItem } = useCart();
  const [extras, setExtras] = useState<Record<string, boolean>>({});
  const [showDiscountInfo, setShowDiscountInfo] = useState(false);
  const [mode, setMode] = useState<"donkey" | "creative">("creative");
  const [showExamples, setShowExamples] = useState(false);

  if (!recipe) return null;

  function isExtraUnlocked(extra: typeof EXTRAS[number]): boolean {
    if (!unlockState) return true; // no unlock data = show everything
    if (extra.key === "needs_additional_format") return unlockState.landscapeUnlocked;
    if (extra.addonKey) return unlockState.unlockedAddons.has(extra.addonKey);
    return true;
  }

  function getExtraUnlockLabel(extra: typeof EXTRAS[number]): string {
    if (extra.key === "needs_additional_format") {
      // Find the milestone that unlocks landscape
      const ms = milestones.find((m) => m.landscape_unlocked);
      return ms ? `Unlocks at ${ms.tier_name} (${ms.min_videos} videos)` : "Locked";
    }
    if (extra.addonKey) {
      const ms = getAddonUnlockMilestone(extra.addonKey, milestones);
      return ms ? `Unlocks at ${ms.tier_name} (${ms.min_videos} videos)` : "Locked";
    }
    return "Locked";
  }

  // Effective duration = base + tier boost (+5s per tier)
  const tierIndex = unlockState ? getTierIndex(unlockState.tier, milestones) : 0;
  const effectiveMaxDuration = getEffectiveDuration(recipe.base_output_seconds, tierIndex);
  const hasDurationBoost = tierIndex > 0;

  const creativeSurcharge = recipe.creative_surcharge_percent ?? 25;
  const extrasTotal = EXTRAS.reduce(
    (sum, e) => sum + (extras[e.key] && isExtraUnlocked(e) ? e.price : 0),
    0
  );
  const rawBase = recipe.price_cents / 100;
  const basePrice = mode === "creative" ? Math.round(rawBase * (1 + creativeSurcharge / 100)) : rawBase;
  const discountedBase = Math.round(basePrice * (1 - userDiscountPct / 100));
  const totalPrice = discountedBase + extrasTotal;
  const fullPrice = basePrice + extrasTotal;

  function toggleExtra(key: string) {
    setExtras((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleAddToCart() {
    await addItem(recipe!.id, {
      needs_additional_format: extras.needs_additional_format ?? false,
      needs_stock_footage: extras.needs_stock_footage ?? false,
      needs_ai_voice: extras.needs_ai_voice ?? false,
      recipe_mode: mode,
    });
    setExtras({});
    onClose();
  }

  const footerContent = (
    <>
      <div className="flex items-center justify-between">
        <div>
          {userDiscountPct > 0 && (
            <span className="font-display text-sm text-cream-31 line-through block">
              &euro;{fullPrice.toFixed(0)}
            </span>
          )}
          <span className="font-display font-bold text-3xl text-cream">
            &euro;{totalPrice.toFixed(0)}
          </span>
          <span className="text-cream-31 text-sm ml-2">per video</span>
        </div>
        <button
          onClick={handleAddToCart}
          className="w-12 h-12 rounded-brand border border-border bg-surface hover:border-accent/50 transition-colors flex items-center justify-center"
        >
          <span className="text-cream text-2xl font-bold leading-none">+</span>
        </button>
      </div>
      <p className="text-cream-31 text-xs mt-2">
        Add a detailed brief after checkout via your dashboard.
      </p>
    </>
  );

  return (
    <Modal isOpen={!!recipe} onClose={onClose} size="lg" footer={footerContent}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="font-display font-bold text-2xl text-cream mb-3">
            {recipe.name}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background/50 rounded-brand p-3 border border-border text-center">
              <span className="text-cream-31 text-[10px] uppercase tracking-wider block mb-1">Delivery</span>
              <span className="text-cream text-sm font-medium">{recipe.turnaround_days} days</span>
            </div>
            <div className="bg-background/50 rounded-brand p-3 border border-border text-center">
              <span className="text-cream-31 text-[10px] uppercase tracking-wider block mb-1">Filming</span>
              <Badge variant={recipe.filming_difficulty === "simple" ? "lime" : "accent"}>
                {recipe.filming_difficulty}
              </Badge>
            </div>
            <div className="bg-background/50 rounded-brand p-3 border border-border text-center">
              <span className="text-cream-31 text-[10px] uppercase tracking-wider block mb-1">Editing</span>
              <Badge variant={recipe.editing_difficulty === "simple" ? "lime" : "accent"}>
                {recipe.editing_difficulty}
              </Badge>
            </div>
            <div className="bg-background/50 rounded-brand p-3 border border-border text-center">
              <span className="text-cream-31 text-[10px] uppercase tracking-wider block mb-1">Max duration</span>
              <span className="text-cream text-sm font-medium">{effectiveMaxDuration}s</span>
              {hasDurationBoost && (
                <span className="text-lime text-[9px] block mt-0.5">
                  +{tierIndex * 5}s tier bonus
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-cream-61 leading-relaxed">
          {recipe.description}
        </p>

        {/* Examples toggle */}
        {recipe.example_urls && recipe.example_urls.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowExamples(!showExamples)}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              {showExamples ? "▾ Hide examples" : "▸ See examples"}
            </button>
            {showExamples && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {[0, 1, 2].map((i) => {
                  const url = recipe.example_urls[i];
                  if (!url) {
                    return (
                      <div
                        key={i}
                        className="aspect-[9/16] rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center"
                      >
                        <span className="text-cream-20 text-xs">No example yet</span>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="aspect-[9/16] rounded-xl overflow-hidden bg-black">
                      <iframe
                        src={getExampleEmbedUrl(url)}
                        className="w-full h-full border-0"
                        allowFullScreen
                        loading="lazy"
                        allow="autoplay; encrypted-media; picture-in-picture"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("donkey")}
            className={`flex-1 p-3 rounded-brand border transition-colors text-left ${
              mode === "donkey"
                ? "border-accent/50 bg-accent/5"
                : "border-border bg-background/50 hover:border-border/80"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>🫏</span>
              <span className={`text-sm font-medium ${mode === "donkey" ? "text-cream" : "text-cream-61"}`}>Donkey Mode</span>
            </div>
            <p className="text-xs text-cream-31">You tell us exactly what to do</p>
          </button>
          <button
            onClick={() => setMode("creative")}
            className={`flex-1 p-3 rounded-brand border transition-colors text-left ${
              mode === "creative"
                ? "border-accent/50 bg-accent/5"
                : "border-border bg-background/50 hover:border-border/80"
            }`}
          >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span>🎨</span>
              <span className={`text-sm font-medium ${mode === "creative" ? "text-cream" : "text-cream-61"}`}>Creative Mode</span>
              <span className="text-[9px] uppercase tracking-wider bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">Recommended</span>
            </div>
            <p className="text-xs text-cream-31">We handle the creative direction (+{creativeSurcharge}%)</p>
          </button>
        </div>

        {/* What you provide / What you get — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-background/50 rounded-brand p-4 border border-border">
            <h3 className="font-display font-bold text-xs text-cream-78 uppercase tracking-wider mb-3">
              What you provide
            </h3>
            <ul className="space-y-2">
              {recipe.intake_form_schema.fields.map((field) => {
                const isDonkeyOnly = field.mode === "donkey";
                const isCreative = mode === "creative";
                if (isDonkeyOnly && isCreative) {
                  return (
                    <li key={field.name} className="flex items-start gap-2 text-sm">
                      <span className="text-cream-20 mt-0.5">&#x2022;</span>
                      <span className="text-cream-31 line-through">{field.label}</span>
                      <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded-full ml-1 shrink-0">✨ {field.weHandleLabel}</span>
                    </li>
                  );
                }
                return (
                  <li key={field.name} className="flex items-start gap-2 text-sm text-cream-61">
                    <span className="text-accent mt-0.5">&#x2022;</span>
                    <span>
                      {field.label}
                      {field.required && <span className="text-accent ml-1">*</span>}
                    </span>
                  </li>
                );
              })}
              <li className="flex items-start gap-2 text-sm text-cream-61">
                <span className="text-accent mt-0.5">&#x2022;</span>
                <span>Raw footage (Google Drive, Dropbox, etc.)</span>
              </li>
              {mode === "creative" && (
                <li className="flex items-start gap-2 text-sm text-accent mt-2">
                  <span className="mt-0.5">✨</span>
                  <span>We send you custom creative directions with script + shot list</span>
                </li>
              )}
            </ul>
          </div>

          <div className="bg-background/50 rounded-brand p-4 border border-border">
            <h3 className="font-display font-bold text-xs text-cream-78 uppercase tracking-wider mb-3">
              What you get
            </h3>
            <ul className="space-y-2">
              {recipe.deliverables_description.map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm text-cream-61">
                  <span className="text-lime mt-0.5">&#x2713;</span>
                  <span>{d}</span>
                </li>
              ))}
              {mode === "creative" && (
                <>
                  <li className="flex items-start gap-2 text-sm text-accent">
                    <span className="mt-0.5">&#x2713;</span>
                    <span>Custom creative direction</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-accent">
                    <span className="mt-0.5">&#x2713;</span>
                    <span>Script + shot list</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Extras */}
        <div>
          <h3 className="font-display font-bold text-xs text-cream-78 uppercase tracking-wider mb-3">
            Extras
          </h3>
          <div className="space-y-2">
            {EXTRAS.map((extra) => {
              const unlocked = isExtraUnlocked(extra);
              if (!unlocked) {
                return (
                  <div
                    key={extra.key}
                    className="flex items-center justify-between p-3 rounded-brand border border-border bg-background/30 opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm">🔒</span>
                      <div>
                        <span className="text-sm text-cream-31">{extra.label}</span>
                        <span className="text-[10px] text-accent ml-2">{getExtraUnlockLabel(extra)}</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-cream-31">+&euro;{extra.price}</span>
                  </div>
                );
              }
              return (
                <label
                  key={extra.key}
                  className={`flex items-center justify-between p-3 rounded-brand border cursor-pointer transition-colors ${
                    extras[extra.key]
                      ? "border-accent/50 bg-accent/5"
                      : "border-border bg-background/50 hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!extras[extra.key]}
                      onChange={() => toggleExtra(extra.key)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        extras[extra.key]
                          ? "border-accent bg-accent"
                          : "border-cream-31"
                      }`}
                    >
                      {extras[extra.key] && (
                        <svg className="w-2.5 h-2.5 text-brown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}>
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className="text-sm text-cream">{extra.label}</span>
                      <span className="text-xs text-cream-31 ml-2">{extra.sublabel}</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-cream">+&euro;{extra.price}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Discount message */}
        {unlockState?.nextMilestone && unlockState.nextMilestone.discount_percent > unlockState.discountPct ? (
          <div className="flex items-center gap-2 bg-lime/5 border border-lime/20 rounded-brand px-4 py-3">
            <span className="text-lime text-sm font-medium">
              Get {unlockState.nextMilestone.discount_percent}% lifetime discount after posting your {unlockState.nextMilestone.min_videos}th video
            </span>
            <button
              type="button"
              onClick={() => setShowDiscountInfo(!showDiscountInfo)}
              className="relative flex-shrink-0 w-4 h-4 rounded-full border border-lime/50 text-lime text-[10px] font-bold flex items-center justify-center hover:bg-lime/10 transition-colors"
            >
              i
            </button>
          </div>
        ) : !unlockState ? (
          <div className="flex items-center gap-2 bg-lime/5 border border-lime/20 rounded-brand px-4 py-3">
            <span className="text-lime text-sm font-medium">
              Get 10% lifetime discount after posting your 6th video
            </span>
            <button
              type="button"
              onClick={() => setShowDiscountInfo(!showDiscountInfo)}
              className="relative flex-shrink-0 w-4 h-4 rounded-full border border-lime/50 text-lime text-[10px] font-bold flex items-center justify-center hover:bg-lime/10 transition-colors"
            >
              i
            </button>
          </div>
        ) : null}
        {showDiscountInfo && (
          <div className="bg-surface border border-border rounded-brand p-4 text-sm text-cream-61 -mt-3">
            Every new client takes time to set up — learning your brand, style, and preferences.
            As we work together and refine the process, production gets faster and our margins improve.
            Instead of pocketing the difference, we pass those savings to you. Discounts can reach up to 25% as you post more.
            The more we collaborate, the cheaper it gets. Simple as that.
          </div>
        )}

      </div>
    </Modal>
  );
}
