"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUnlockState, canRequestTierUpgrade, type Milestone } from "@/lib/unlocks";
import { getRecipeIcon } from "@/lib/constants";

interface RewardsTrackerProps {
  lifetimeVideoCount?: number;
  approvedVideoCount?: number;
  currentDiscountPercent?: number;
  lifetimeSpentCents?: number;
  mode?: "dashboard" | "pricing";
  brandId?: string;
  pendingUpgradeRequest?: boolean;
}

export default function RewardsTracker({
  lifetimeVideoCount = 0,
  approvedVideoCount = 0,
  currentDiscountPercent = 0,
  lifetimeSpentCents = 0,
  mode = "dashboard",
  brandId,
  pendingUpgradeRequest = false,
}: RewardsTrackerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [avgPriceCents, setAvgPriceCents] = useState<number>(0);
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("unlock_milestones")
      .select("*")
      .order("min_videos")
      .then(({ data }) => setMilestones((data ?? []) as Milestone[]));
    supabase
      .from("video_recipes")
      .select("price_cents")
      .eq("is_active", true)
      .eq("recipe_type", "video")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const avg = data.reduce((sum, r) => sum + r.price_cents, 0) / data.length;
          setAvgPriceCents(Math.round(avg));
        }
      });
  }, []);

  if (milestones.length === 0) return null;

  const unlock = getUnlockState(approvedVideoCount, milestones);
  const upgradeCheck = canRequestTierUpgrade(lifetimeVideoCount, approvedVideoCount, milestones);

  const currentMilestoneIndex = milestones.findIndex(
    (ms) => ms.id === unlock.currentMilestone?.id
  );
  const nextMilestone = unlock.nextMilestone;
  const videosToNext = nextMilestone
    ? nextMilestone.min_videos - lifetimeVideoCount
    : 0;

  return (
    <div className="space-y-8">
      {/* Stats bar — dashboard only */}
      {mode === "dashboard" && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Videos ordered"
            value={String(lifetimeVideoCount)}
          />
          <StatCard
            label="Current discount"
            value={`${currentDiscountPercent}%`}
            accent
          />
          <StatCard
            label="Total spent"
            value={`€${(lifetimeSpentCents / 100).toFixed(0)}`}
          />
        </div>
      )}

      {/* Milestone roadmap */}
      <div className="space-y-6">
        {milestones.map((ms, i) => {
          const isDashboard = mode === "dashboard";
          const isUnlocked = isDashboard && i <= currentMilestoneIndex;
          const isCurrent = isDashboard && i === currentMilestoneIndex;
          const isLocked = !isUnlocked;
          const isNext = isDashboard && nextMilestone?.id === ms.id;

          // Determine border color based on discount
          const borderColor = isCurrent
            ? ms.discount_percent >= 20
              ? "border-accent"
              : ms.discount_percent >= 15
                ? "border-lime/50"
                : ms.discount_percent >= 10
                  ? "border-accent/50"
                  : "border-cream-31"
            : "border-border";

          const glowClass = isCurrent
            ? ms.discount_percent >= 15
              ? "animate-pulse-glow-lime"
              : ms.discount_percent >= 10
                ? "animate-pulse-glow"
                : ""
            : "";

          // Categorize all unlocks for this milestone
          type CatItem = { icon: string; label: string };

          const recipes: CatItem[] = ms.unlocked_recipe_slugs.map((slug) => ({
            icon: getRecipeIcon(slug),
            label: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          }));

          // Add recipe-category perks (e.g. "Early access to new recipes")
          for (const perk of ms.perks) {
            if (perk.category === "recipes") {
              recipes.push({ icon: perk.icon, label: perk.label });
            }
          }

          const features: CatItem[] = [];
          for (const addon of ms.unlocked_addons) {
            features.push({
              icon: addon === "stock_footage" ? "🎞️" : addon === "ai_voice" ? "🤖" : addon === "expedited" ? "⚡" : addon === "brief_templates" ? "📝" : addon === "professional_color_grading" ? "🎨" : addon === "charity_choice" ? "💝" : "🎁",
              label: addon.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            });
          }
          if (ms.landscape_unlocked) {
            const first = milestones.find((m) => m.landscape_unlocked);
            if (first?.id === ms.id) features.push({ icon: "🖥️", label: "16:9 landscape" });
          }
          if (ms.dual_format_free) {
            const first = milestones.find((m) => m.dual_format_free);
            if (first?.id === ms.id) features.push({ icon: "🎬", label: "Dual format free" });
          }
          if (ms.custom_requests_unlocked) {
            const first = milestones.find((m) => m.custom_requests_unlocked);
            if (first?.id === ms.id) features.push({ icon: "✏️", label: "Custom requests" });
          }
          if (i > 0) {
            features.push({ icon: "⏱️", label: `+${i * 5}s duration bonus` });
          }

          // Support perks only
          const supportPerks: CatItem[] = [];
          for (const perk of ms.perks) {
            if (perk.label.includes("discount")) continue;
            if (perk.category === "support") supportPerks.push(perk);
          }

          // Cumulative data for "Full package" expansion
          const cumRecipes: CatItem[] = [];
          const cumFeatures: CatItem[] = [];
          const cumSupport: CatItem[] = [];
          if (i > 0 && expandedTiers.has(ms.id)) {
            const seenR = new Set<string>();
            const seenF = new Set<string>();
            const seenS = new Set<string>();
            for (let j = 0; j <= i; j++) {
              const m = milestones[j];
              for (const slug of m.unlocked_recipe_slugs) {
                if (!seenR.has(slug)) {
                  seenR.add(slug);
                  cumRecipes.push({ icon: getRecipeIcon(slug), label: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) });
                }
              }
              for (const perk of m.perks) {
                if (perk.category === "recipes" && !seenR.has(perk.label)) {
                  seenR.add(perk.label);
                  cumRecipes.push({ icon: perk.icon, label: perk.label });
                }
              }
              for (const addon of m.unlocked_addons) {
                if (!seenF.has(addon)) {
                  seenF.add(addon);
                  cumFeatures.push({
                    icon: addon === "stock_footage" ? "🎞️" : addon === "ai_voice" ? "🤖" : addon === "expedited" ? "⚡" : addon === "brief_templates" ? "📝" : addon === "professional_color_grading" ? "🎨" : addon === "charity_choice" ? "💝" : "🎁",
                    label: addon.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                  });
                }
              }
              if (m.landscape_unlocked && !seenF.has("landscape")) {
                seenF.add("landscape");
                cumFeatures.push({ icon: "🖥️", label: "16:9 landscape" });
              }
              if (m.dual_format_free && !seenF.has("dual_format")) {
                seenF.add("dual_format");
                cumFeatures.push({ icon: "🎬", label: "Dual format free" });
              }
              if (m.custom_requests_unlocked && !seenF.has("custom_requests")) {
                seenF.add("custom_requests");
                cumFeatures.push({ icon: "✏️", label: "Custom requests" });
              }
              for (const perk of m.perks) {
                if (perk.label.includes("discount")) continue;
                if (perk.category === "support" && !seenS.has(perk.label)) {
                  seenS.add(perk.label);
                  cumSupport.push(perk);
                }
              }
            }
            cumFeatures.push({ icon: "⏱️", label: `+${i * 5}s duration bonus` });
          }

          return (
            <div key={ms.id}>
              <div
                className={`
                  rounded-brand border p-5 transition-all duration-300
                  ${isCurrent
                    ? `bg-surface ${borderColor} ${glowClass}`
                    : isUnlocked
                      ? "bg-surface/80 border-border"
                      : "bg-background/50 border-border/50"
                  }
                `}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Node dot */}
                    <div
                      className={`
                        relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0
                        ${isCurrent
                          ? "bg-accent/20 text-accent animate-breathe"
                          : isUnlocked
                            ? "bg-lime/20 text-lime"
                            : "bg-surface text-cream-31 border border-border"
                        }
                      `}
                    >
                      {isUnlocked && !isCurrent ? (
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-sm">{ms.discount_percent}%</span>
                      )}
                      {isCurrent && (
                        <div
                          className="absolute inset-0 rounded-full border-2 border-accent/40 animate-ping"
                          style={{ animationDuration: "2s" }}
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-display font-bold text-lg ${
                            isCurrent || isUnlocked
                              ? "text-cream"
                              : "text-cream-61"
                          }`}
                        >
                          {ms.tier_name}
                        </h3>
                        {isCurrent && (
                          <span className="text-[10px] uppercase tracking-wider bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
                            Current
                          </span>
                        )}
                        {isUnlocked && !isCurrent && (
                          <span className="text-[10px] uppercase tracking-wider bg-lime/20 text-lime px-2 py-0.5 rounded-full font-medium">
                            Unlocked
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs ${
                          isLocked ? "text-cream-31" : "text-cream-61"
                        }`}
                      >
                        {ms.min_videos} video{ms.min_videos !== 1 ? "s" : ""} posted
                        {ms.discount_percent > 0 &&
                          ` · ${ms.discount_percent}% off everything`}
                      </p>
                      {ms.discount_percent > 0 && avgPriceCents > 0 && (
                        <p className="text-xs mt-0.5">
                          <span className="text-cream-31">avg. </span>
                          <span className="text-cream-31 line-through">€{(avgPriceCents / 100).toFixed(0)}</span>
                          <span className={`ml-1 font-medium ${isCurrent ? "text-accent" : isUnlocked ? "text-lime" : "text-cream-61"}`}>
                            €{Math.round(avgPriceCents * (1 - ms.discount_percent / 100) / 100)}
                          </span>
                          <span className="text-cream-31"> /video</span>
                        </p>
                      )}
                    </div>
                  </div>
                  {i > 0 && (
                    <button
                      onClick={() => toggleExpand(ms.id)}
                      className="text-[10px] uppercase tracking-wider text-cream-31 hover:text-cream transition-colors shrink-0 self-start mt-1"
                    >
                      {expandedTiers.has(ms.id) ? "▾ Hide package" : "▸ Full package"}
                    </button>
                  )}
                </div>

                {/* Progress bar — next tier to unlock */}
                {isNext && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-cream-31 text-xs">
                        {videosToNext > 0
                          ? `${videosToNext} more video${videosToNext !== 1 ? "s" : ""} to complete`
                          : "All videos completed"}
                      </span>
                      <span className="text-cream-31 text-xs font-medium">
                        {lifetimeVideoCount}/{ms.min_videos}
                      </span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${Math.min(100, (lifetimeVideoCount / ms.min_videos) * 100)}%`,
                          background:
                            "linear-gradient(90deg, #eda4e8, #ddf073)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Tier upgrade form — show when eligible and no pending request */}
                {isNext && upgradeCheck.eligible && !pendingUpgradeRequest && brandId && (
                  <TierUpgradeForm brandId={brandId} milestoneId={ms.id} />
                )}
                {isNext && pendingUpgradeRequest && (
                  <div className="mb-4 p-3 rounded-brand bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400 text-xs font-medium">
                      Proof submitted — waiting for review
                    </p>
                  </div>
                )}

                {/* Categorized unlocks */}
                <div className={`space-y-3 ${isLocked ? "opacity-50" : ""}`}>
                  {/* Recipes — accent mini cards */}
                  {recipes.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-medium text-accent/70 mb-1.5">Recipes</p>
                      <div className="flex flex-wrap gap-2">
                        {recipes.map((r) => (
                          <div
                            key={r.label}
                            className={`
                              flex items-center gap-2 px-3 py-2 rounded-xl border
                              ${isCurrent
                                ? "bg-accent/10 border-accent/20 text-accent"
                                : isUnlocked
                                  ? "bg-accent/10 border-accent/20 text-accent/80"
                                  : "bg-background/50 border-border text-cream-31"
                              }
                            `}
                          >
                            <span className="text-base">{r.icon}</span>
                            <span className="text-sm font-medium">{r.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Features — lime pills */}
                  {features.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-medium text-lime/70 mb-1.5">Features</p>
                      <div className="flex flex-wrap gap-1.5">
                        {features.map((f) => (
                          <span
                            key={f.label}
                            className={`
                              inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full
                              ${isCurrent
                                ? "bg-lime/10 text-lime"
                                : isUnlocked
                                  ? "bg-lime/10 text-lime/80"
                                  : "bg-background text-cream-31"
                              }
                            `}
                          >
                            <span>{f.icon}</span>
                            {f.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Support — left-bordered list */}
                  {supportPerks.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-medium text-cream-31 mb-1.5">Support</p>
                      <div className={`space-y-1 border-l-2 pl-3 ${
                        isCurrent ? "border-cream-31" : "border-cream-20"
                      }`}>
                        {supportPerks.map((s) => (
                          <div key={s.label} className="flex items-center gap-2">
                            <span className="text-sm">{s.icon}</span>
                            <span className={`text-sm ${isCurrent || isUnlocked ? "text-cream-78" : "text-cream-31"}`}>
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded cumulative package */}
                {i > 0 && expandedTiers.has(ms.id) && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-[10px] uppercase tracking-widest font-medium text-cream-31 mb-3">
                      Complete package at {ms.tier_name}
                    </p>
                    <p className="text-xs text-cream-31 mb-3 italic">
                      Everything from previous tiers carries over.
                    </p>
                    <div className={`space-y-3 ${isLocked ? "opacity-50" : ""}`}>
                      {cumRecipes.length > 0 && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest font-medium text-accent/70 mb-1.5">All Recipes</p>
                          <div className="flex flex-wrap gap-2">
                            {cumRecipes.map((r) => (
                              <div key={r.label} className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-accent/5 border-accent/10 text-accent/70">
                                <span className="text-base">{r.icon}</span>
                                <span className="text-sm font-medium">{r.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {cumFeatures.length > 0 && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest font-medium text-lime/70 mb-1.5">All Features</p>
                          <div className="flex flex-wrap gap-1.5">
                            {cumFeatures.map((f) => (
                              <span key={f.label} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-lime/5 text-lime/70">
                                <span>{f.icon}</span>
                                {f.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {cumSupport.length > 0 && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest font-medium text-cream-31 mb-1.5">All Support</p>
                          <div className="space-y-1 border-l-2 pl-3 border-cream-20">
                            {cumSupport.map((s) => (
                              <div key={s.label} className="flex items-center gap-2">
                                <span className="text-sm">{s.icon}</span>
                                <span className="text-sm text-cream-61">{s.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="p-4 bg-background rounded-brand border border-border">
      <p className="text-xs text-cream-31 mb-1">{label}</p>
      <p
        className={`text-3xl font-black font-display ${
          accent ? "text-accent" : "text-cream"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TierUpgradeForm({
  brandId,
  milestoneId,
}: {
  brandId: string;
  milestoneId: string;
}) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in"); setSubmitting(false); return; }

    const { error: insertError } = await supabase
      .from("tier_upgrade_requests")
      .insert({
        brand_id: brandId,
        user_id: user.id,
        video_link: url.trim(),
        target_milestone_id: milestoneId,
      });

    if (insertError) {
      setError("Failed to submit. Try again.");
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="mb-4 p-3 rounded-brand bg-amber-500/10 border border-amber-500/20">
        <p className="text-amber-400 text-xs font-medium">
          Proof submitted — waiting for review
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-brand bg-background border border-accent/20">
      <p className="text-cream text-xs font-medium mb-2">
        Ready to unlock the next tier? Paste a link to a video you&apos;ve posted.
      </p>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://instagram.com/p/..."
          required
          className="flex-1 px-3 py-2 rounded-brand bg-surface border border-border text-cream text-sm placeholder:text-cream-31 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
        <button
          type="submit"
          disabled={submitting || !url.trim()}
          className="px-4 py-2 rounded-brand bg-accent text-background text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {submitting ? "..." : "Submit"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </form>
  );
}
