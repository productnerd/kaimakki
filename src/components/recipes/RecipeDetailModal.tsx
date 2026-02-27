"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { type UnlockState, type Milestone, getAddonUnlockMilestone } from "@/lib/unlocks";

type Recipe = {
  id: string;
  slug: string;
  name: string;
  description: string;
  complexity: string;
  price_cents: number;
  turnaround_days: number;
  max_output_seconds: number;
  intake_form_schema: { fields: { name: string; label: string; type: string; required?: boolean }[] };
  deliverables_description: string[];
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

export default function RecipeDetailModal({ recipe, onClose, userDiscountPct = 0, unlockState, milestones = [] }: RecipeDetailModalProps) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [extras, setExtras] = useState<Record<string, boolean>>({});
  const [showDiscountInfo, setShowDiscountInfo] = useState(false);

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

  // Effective max duration = min of recipe cap and user's tier cap
  const effectiveMaxDuration = unlockState
    ? Math.min(recipe.max_output_seconds, unlockState.maxDurationSeconds)
    : recipe.max_output_seconds;
  const durationCapped = unlockState && unlockState.maxDurationSeconds < recipe.max_output_seconds;

  const extrasTotal = EXTRAS.reduce(
    (sum, e) => sum + (extras[e.key] && isExtraUnlocked(e) ? e.price : 0),
    0
  );
  const basePrice = recipe.price_cents / 100;
  const discountedBase = Math.round(basePrice * (1 - userDiscountPct / 100));
  const totalPrice = discountedBase + extrasTotal;
  const fullPrice = basePrice + extrasTotal;

  function toggleExtra(key: string) {
    setExtras((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleAddToCart() {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    await addItem(recipe!.id, {
      needs_additional_format: extras.needs_additional_format ?? false,
      needs_stock_footage: extras.needs_stock_footage ?? false,
      needs_ai_voice: extras.needs_ai_voice ?? false,
    });
    setExtras({});
    onClose();
  }

  return (
    <Modal isOpen={!!recipe} onClose={onClose} size="lg">
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
              <span className="text-cream-31 text-[10px] uppercase tracking-wider block mb-1">Complexity</span>
              <Badge variant={recipe.complexity === "simple" ? "lime" : "accent"}>
                {recipe.complexity}
              </Badge>
            </div>
            <div className="bg-background/50 rounded-brand p-3 border border-border text-center">
              <span className="text-cream-31 text-[10px] uppercase tracking-wider block mb-1">Max duration</span>
              <span className="text-cream text-sm font-medium">{effectiveMaxDuration}s</span>
              {durationCapped && (
                <span className="text-accent text-[9px] block mt-0.5">
                  Up to {recipe.max_output_seconds}s at higher tiers
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-cream-61 leading-relaxed">
          {recipe.description}
        </p>

        {/* What you provide / What you get — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-background/50 rounded-brand p-4 border border-border">
            <h3 className="font-display font-bold text-xs text-cream-78 uppercase tracking-wider mb-3">
              What you provide
            </h3>
            <ul className="space-y-2">
              {recipe.intake_form_schema.fields.map((field) => (
                <li key={field.name} className="flex items-start gap-2 text-sm text-cream-61">
                  <span className="text-accent mt-0.5">&#x2022;</span>
                  <span>
                    {field.label}
                    {field.required && <span className="text-accent ml-1">*</span>}
                  </span>
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm text-cream-61">
                <span className="text-accent mt-0.5">&#x2022;</span>
                <span>Raw footage (Google Drive, Dropbox, etc.)</span>
              </li>
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
              Get {unlockState.nextMilestone.discount_percent}% lifetime discount after your {unlockState.nextMilestone.min_videos}{unlockState.nextMilestone.min_videos === 3 ? "rd" : "th"} video
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
              Get 10% lifetime discount after your 3rd video
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
            Instead of pocketing the difference, we pass those savings to you. The more we collaborate,
            the cheaper it gets. Simple as that.
          </div>
        )}

        {/* Price and CTA */}
        <div className="flex items-center justify-between pt-2">
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

        {/* Dashboard brief note */}
        <p className="text-cream-31 text-xs text-center -mt-2">
          Add a detailed brief and inspirations after checkout via your dashboard.
        </p>
      </div>
    </Modal>
  );
}
