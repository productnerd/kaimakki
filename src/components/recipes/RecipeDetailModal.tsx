"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { useCart } from "@/providers/CartProvider";
import { type UnlockState, type Milestone, getAddonUnlockMilestone, getEffectiveDuration, getTierIndex } from "@/lib/unlocks";

type RecipeAddon = {
  id: string;
  addon_key: string;
  label: string;
  sublabel: string | null;
  price_cents: number;
  price_percent: number | null;
  max_quantity: number;
  unlock_addon_key: string | null;
  unlock_requires_landscape: boolean;
  sort_order: number;
};

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
  recipe_use_cases?: { id: string; name: string; isRecommended?: boolean }[];
  recipe_addons?: RecipeAddon[];
};

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  userDiscountPct?: number;
  unlockState?: UnlockState | null;
  milestones?: Milestone[];
}

const ADDON_KEY_TO_CART_FIELD: Record<string, string> = {
  additional_format: "needs_additional_format",
  stock_footage: "needs_stock_footage",
  ai_voice: "needs_ai_voice",
  expedited: "needs_expedited",
};

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
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [customUseCase, setCustomUseCase] = useState("");
  const [extraDurationQty, setExtraDurationQty] = useState(0);

  // No longer clearing use case on mode switch - Full Production allows optional use case selection

  if (!recipe) return null;

  const addons = [...(recipe.recipe_addons ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const tierOverrides = unlockState?.addonPriceOverrides ?? {};

  function isAddonUnlocked(addon: RecipeAddon): boolean {
    if (!unlockState) return true;
    if (addon.unlock_requires_landscape) return unlockState.landscapeUnlocked;
    if (addon.unlock_addon_key) return unlockState.unlockedAddons.has(addon.unlock_addon_key);
    return true;
  }

  function getAddonUnlockLabel(addon: RecipeAddon): string {
    if (addon.unlock_requires_landscape) {
      const ms = milestones.find((m) => m.landscape_unlocked);
      return ms ? `Unlocks at ${ms.tier_name} (${ms.min_videos} videos)` : "Locked";
    }
    if (addon.unlock_addon_key) {
      const ms = getAddonUnlockMilestone(addon.unlock_addon_key, milestones);
      return ms ? `Unlocks at ${ms.tier_name} (${ms.min_videos} videos)` : "Locked";
    }
    return "Locked";
  }

  function getEffectivePrice(addon: RecipeAddon): number {
    if (addon.addon_key in tierOverrides) return tierOverrides[addon.addon_key];
    return addon.price_cents;
  }

  function hasTierOverride(addon: RecipeAddon): boolean {
    return addon.addon_key in tierOverrides && tierOverrides[addon.addon_key] !== addon.price_cents;
  }

  // Split addons: paid fixed-price = Extras, free = Preferences, percentage-based handled separately
  const percentAddon = addons.find((a) => a.price_percent != null);
  const fixedAddons = addons.filter((a) => a.price_percent == null);
  const paidAddons = fixedAddons.filter((a) => a.price_cents > 0);
  const freeAddons = fixedAddons.filter((a) => a.price_cents === 0);

  const tierIndex = unlockState ? getTierIndex(unlockState.tier, milestones) : 0;
  const effectiveMaxDuration = getEffectiveDuration(recipe.base_output_seconds, tierIndex);
  const hasDurationBoost = tierIndex > 0;

  const creativeSurcharge = recipe.creative_surcharge_percent ?? 25;
  const cartFieldKey = (addon: RecipeAddon) => ADDON_KEY_TO_CART_FIELD[addon.addon_key] ?? addon.addon_key;
  const fixedExtrasTotal = fixedAddons.reduce((sum, a) => {
    const field = cartFieldKey(a);
    if (!extras[field] || !isAddonUnlocked(a)) return sum;
    return sum + getEffectivePrice(a) / 100;
  }, 0);
  const rawBase = recipe.price_cents / 100;
  const basePrice = mode === "creative" ? Math.round(rawBase * (1 + creativeSurcharge / 100)) : rawBase;
  const percentAddonTotal = percentAddon ? Math.round(rawBase * (percentAddon.price_percent! / 100) * extraDurationQty) : 0;
  const extrasTotal = fixedExtrasTotal + percentAddonTotal;
  const discountedBase = Math.round(basePrice * (1 - userDiscountPct / 100));
  const totalPrice = discountedBase + extrasTotal;
  const fullPrice = basePrice + extrasTotal;

  function toggleExtra(key: string) {
    setExtras((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const useCases = recipe.recipe_use_cases ?? [];
  const hasUseCases = useCases.length > 0;
  const resolvedUseCase = selectedUseCase === "__other__" ? customUseCase.trim() : selectedUseCase;
  // In Full Production (creative) mode, use case is optional
  const canAdd = !hasUseCases || mode === "creative" || (resolvedUseCase && resolvedUseCase.length > 0);

  async function handleAddToCart() {
    if (hasUseCases && !canAdd) return;
    await addItem(recipe!.id, {
      needs_additional_format: extras.needs_additional_format ?? false,
      needs_stock_footage: extras.needs_stock_footage ?? false,
      needs_ai_voice: extras.needs_ai_voice ?? false,
      needs_expedited: extras.needs_expedited ?? false,
      extra_duration_qty: extraDurationQty,
      recipe_mode: mode,
      selected_use_case: resolvedUseCase || undefined,
    });
    setExtras({});
    setExtraDurationQty(0);
    setSelectedUseCase(null);
    setCustomUseCase("");
    onClose();
  }

  function renderAddonRow(addon: RecipeAddon) {
    const field = cartFieldKey(addon);
    const unlocked = isAddonUnlocked(addon);
    const effectivePrice = getEffectivePrice(addon);
    const hasOverride = hasTierOverride(addon);

    if (!unlocked) {
      return (
        <div
          key={addon.id}
          className="flex items-center justify-between p-3 rounded-brand border border-border bg-background/30 opacity-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm">🔒</span>
            <div>
              <span className="text-sm text-cream-31">{addon.label}</span>
              <span className="text-[10px] text-accent ml-2">{getAddonUnlockLabel(addon)}</span>
            </div>
          </div>
          <span className="text-sm font-medium text-cream-31 pr-2">+&euro;{(addon.price_cents / 100).toFixed(0)}</span>
        </div>
      );
    }

    return (
      <label
        key={addon.id}
        className={`flex items-center justify-between p-3 rounded-brand border cursor-pointer transition-colors ${
          extras[field]
            ? "border-accent/50 bg-accent/5"
            : "border-border bg-background/50 hover:border-border/80"
        }`}
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={!!extras[field]}
            onChange={() => toggleExtra(field)}
            className="sr-only"
          />
          <div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              extras[field]
                ? "border-accent bg-accent"
                : "border-cream-31"
            }`}
          >
            {extras[field] && (
              <svg className="w-2.5 h-2.5 text-brown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}>
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div>
            <span className="text-sm text-cream">{addon.label}</span>
            {addon.sublabel && <span className="text-xs text-cream-31 ml-2">{addon.sublabel}</span>}
          </div>
        </div>
        <div className="text-right pr-2">
          {hasOverride && (
            <span className="text-xs text-cream-31 line-through mr-2">
              +&euro;{(addon.price_cents / 100).toFixed(0)}
            </span>
          )}
          <span className="text-sm font-medium text-cream">
            {effectivePrice === 0 ? "Free" : `+\u20AC${(effectivePrice / 100).toFixed(0)}`}
          </span>
        </div>
      </label>
    );
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
          disabled={!canAdd}
          className={`w-12 h-12 rounded-brand border transition-colors flex items-center justify-center ${
            canAdd
              ? "border-border bg-surface hover:border-accent/50"
              : "border-border/50 bg-surface/50 opacity-40 cursor-not-allowed"
          }`}
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
              <span className="text-cream-31 text-[10px] uppercase tracking-wider block mb-1">Filming Complexity</span>
              <Badge variant={recipe.filming_difficulty === "simple" ? "lime" : "accent"}>
                {recipe.filming_difficulty}
              </Badge>
            </div>
            <div className="bg-background/50 rounded-brand p-3 border border-border text-center">
              <span className="text-cream-31 text-[10px] uppercase tracking-wider block mb-1">Editing Complexity</span>
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

        {/* Use case selector / display */}
        {hasUseCases && (
          <div>
            <h3 className="font-display font-bold text-xs text-cream-78 uppercase tracking-wider mb-3">
              What type of video?
              {mode === "donkey" && (
                <span className="font-body font-normal normal-case tracking-normal text-cream-31 ml-2">· Select one</span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2">
              {useCases.map((uc) => (
                <button
                  key={uc.id}
                  type="button"
                  onClick={() => {
                    setSelectedUseCase(selectedUseCase === uc.name ? null : uc.name);
                    setCustomUseCase("");
                  }}
                  className={`text-sm px-3 py-1.5 rounded-brand border transition-colors ${
                    selectedUseCase === uc.name
                      ? "border-accent/50 bg-accent/10 text-cream"
                      : "border-border bg-background/50 text-cream-61 hover:border-border/80"
                  }`}
                >
                  {uc.isRecommended && <span className="mr-0.5">⭐</span>}
                  {uc.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectedUseCase(selectedUseCase === "__other__" ? null : "__other__");
                }}
                className={`text-sm px-3 py-1.5 rounded-brand border transition-colors ${
                  selectedUseCase === "__other__"
                    ? "border-accent/50 bg-accent/10 text-cream"
                    : "border-border bg-background/50 text-cream-61 hover:border-border/80"
                }`}
              >
                Other
              </button>
            </div>
            {selectedUseCase === "__other__" && (
              <input
                type="text"
                value={customUseCase}
                onChange={(e) => setCustomUseCase(e.target.value.slice(0, 50))}
                placeholder="Describe your video type..."
                className="mt-2 w-full px-3 py-2 rounded-brand bg-background border border-border text-cream text-sm placeholder:text-cream-31 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                maxLength={50}
              />
            )}
            {mode === "creative" && (
              <p className="text-cream-31 text-[11px] mt-2">
                Leave blank and we&apos;ll pick the best format for you.
              </p>
            )}
          </div>
        )}

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
            onClick={() => setMode("creative")}
            className={`flex-1 p-3 rounded-brand border transition-colors text-left ${
              mode === "creative"
                ? "border-accent/50 bg-accent/5"
                : "border-border bg-background/50 hover:border-border/80"
            }`}
          >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span>🎬</span>
              <span className={`text-sm font-medium ${mode === "creative" ? "text-cream" : "text-cream-61"}`}>Full Production</span>
              <span className="text-[9px] uppercase tracking-wider bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">Recommended</span>
            </div>
            <p className="text-xs text-cream-31">We handle the creative direction</p>
          </button>
          <button
            onClick={() => setMode("donkey")}
            className={`flex-1 p-3 rounded-brand border transition-colors text-left ${
              mode === "donkey"
                ? "border-accent/50 bg-accent/5"
                : "border-border bg-background/50 hover:border-border/80"
            }`}
          >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span>🫏</span>
              <span className={`text-sm font-medium ${mode === "donkey" ? "text-cream" : "text-cream-61"}`}>Donkey Mode</span>
              <span className="text-[9px] text-lime bg-lime/10 px-1.5 py-0.5 rounded-full">-{creativeSurcharge}% &minus;&euro;{Math.round(rawBase * creativeSurcharge / 100)}</span>
            </div>
            <p className="text-xs text-cream-31">You tell us exactly what to do</p>
          </button>
        </div>

        {/* What you provide / What you get - side by side */}
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
              {(recipe.deliverables_description ?? []).map((d) => (
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

        {/* Extras (paid addons) */}
        {(paidAddons.length > 0 || percentAddon) && (
          <div>
            <h3 className="font-display font-bold text-xs text-cream-78 uppercase tracking-wider mb-3">
              Extras
            </h3>
            <div className="space-y-2">
              {paidAddons.map(renderAddonRow)}
              {/* Stackable percentage-based addon */}
              {percentAddon && (
                <div
                  className={`flex items-center justify-between p-3 rounded-brand border transition-colors ${
                    extraDurationQty > 0
                      ? "border-accent/50 bg-accent/5"
                      : "border-border bg-background/50"
                  }`}
                >
                  <div>
                    <span className="text-sm text-cream">{percentAddon.label}</span>
                    <span className="text-xs text-cream-31 ml-2">{percentAddon.sublabel}</span>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <span className="text-xs text-cream-31">
                      +{percentAddon.price_percent}% each
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setExtraDurationQty(Math.max(0, extraDurationQty - 1))}
                        className="w-6 h-6 rounded-full border border-border text-cream-61 text-xs flex items-center justify-center hover:border-accent/50 transition-colors disabled:opacity-30"
                        disabled={extraDurationQty === 0}
                      >
                        −
                      </button>
                      <span className="text-sm font-medium text-cream w-4 text-center">{extraDurationQty}</span>
                      <button
                        type="button"
                        onClick={() => setExtraDurationQty(Math.min(percentAddon.max_quantity, extraDurationQty + 1))}
                        className="w-6 h-6 rounded-full border border-border text-cream-61 text-xs flex items-center justify-center hover:border-accent/50 transition-colors disabled:opacity-30"
                        disabled={extraDurationQty >= percentAddon.max_quantity}
                      >
                        +
                      </button>
                    </div>
                    {extraDurationQty > 0 && (
                      <span className="text-sm font-medium text-cream ml-1">
                        +&euro;{percentAddonTotal}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preferences (free addons) */}
        {freeAddons.length > 0 && (
          <div>
            <h3 className="font-display font-bold text-xs text-cream-78 uppercase tracking-wider mb-3">
              Preferences
            </h3>
            <div className="space-y-2">
              {freeAddons.map(renderAddonRow)}
            </div>
          </div>
        )}

        {/* Discount message - accordion style */}
        {unlockState?.nextMilestone && unlockState.nextMilestone.discount_percent > unlockState.discountPct ? (
          <div className="bg-lime/5 border border-lime/20 rounded-brand px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lime text-sm font-medium">
                Get {unlockState.nextMilestone.discount_percent}% lifetime discount after posting your {unlockState.nextMilestone.min_videos}th video
              </span>
              <button
                type="button"
                onClick={() => setShowDiscountInfo(!showDiscountInfo)}
                className="flex-shrink-0 w-4 h-4 rounded-full border border-lime/50 text-lime text-[10px] font-bold flex items-center justify-center hover:bg-lime/10 transition-colors"
              >
                i
              </button>
            </div>
            {showDiscountInfo && (
              <p className="text-cream-31 text-[11px] mt-2 leading-relaxed">
                Every new client takes time to set up - learning your brand, style, and preferences.
                As we work together and refine the process, production gets faster and our margins improve.
                Instead of pocketing the difference, we pass those savings to you. Discounts can reach up to 25% as you post more.
                The more we collaborate, the cheaper it gets. Simple as that.
              </p>
            )}
          </div>
        ) : !unlockState ? (
          <div className="bg-lime/5 border border-lime/20 rounded-brand px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lime text-sm font-medium">
                Get 10% lifetime discount after posting your 6th video
              </span>
              <button
                type="button"
                onClick={() => setShowDiscountInfo(!showDiscountInfo)}
                className="flex-shrink-0 w-4 h-4 rounded-full border border-lime/50 text-lime text-[10px] font-bold flex items-center justify-center hover:bg-lime/10 transition-colors"
              >
                i
              </button>
            </div>
            {showDiscountInfo && (
              <p className="text-cream-31 text-[11px] mt-2 leading-relaxed">
                Every new client takes time to set up - learning your brand, style, and preferences.
                As we work together and refine the process, production gets faster and our margins improve.
                Instead of pocketing the difference, we pass those savings to you. Discounts can reach up to 25% as you post more.
                The more we collaborate, the cheaper it gets. Simple as that.
              </p>
            )}
          </div>
        ) : null}

      </div>
    </Modal>
  );
}
