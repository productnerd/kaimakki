"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRecipeIcon } from "@/lib/constants";
import { getUnlockState, canRequestTierUpgrade, type Milestone, type UnlockState } from "@/lib/unlocks";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RecipeDetailModal from "@/components/recipes/RecipeDetailModal";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";

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
  min_tier_videos: number;
  intake_form_schema: { fields: { name: string; label: string; type: string; required?: boolean; mode?: string; weHandleLabel?: string }[] };
  deliverables_description: string[];
  example_video_url: string | null;
  creative_surcharge_percent: number;
  example_urls: string[];
  recipe_use_cases: { id: string; name: string }[];
  recipe_addons?: { id: string; addon_key: string; label: string; sublabel: string | null; price_cents: number; price_percent: number | null; max_quantity: number; unlock_addon_key: string | null; unlock_requires_landscape: boolean; sort_order: number }[];
};


const DIFFICULTY_RANK: Record<string, number> = {
  simple: 0,
  moderate: 1,
  "somewhat complex": 2,
  "very complex": 3,
};

function getOverallDifficulty(filming: string, editing: string): string {
  return (DIFFICULTY_RANK[filming] ?? 0) >= (DIFFICULTY_RANK[editing] ?? 0) ? filming : editing;
}

function getEmbedUrl(url: string): string {
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^/?]+)/);
  if (shortsMatch) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&mute=1&loop=1&controls=0&playlist=${shortsMatch[1]}`;
  }
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&mute=1&controls=0`;
  }
  return url.replace(/\/?$/, "/embed/");
}

export default function BuyVideosPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [userDiscountPct, setUserDiscountPct] = useState(0);
  const [lifetimeCount, setLifetimeCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [hasPendingUpgrade, setHasPendingUpgrade] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  function applyDiscount(cents: number): number {
    return Math.round(cents * (1 - unlock.discountPct / 100));
  }

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("video_recipes")
        .select("*, recipe_use_cases(id, name, sort_order), recipe_addons(id, addon_key, label, sublabel, price_cents, price_percent, max_quantity, unlock_addon_key, unlock_requires_landscape, sort_order)")
        .eq("is_active", true)
        .eq("recipe_type", "video")
        .order("sort_order"),
      supabase
        .from("unlock_milestones")
        .select("*")
        .order("min_videos"),
    ]).then(([recipesRes, milestonesRes]) => {
      const recipes = (recipesRes.data || []).map((r: Record<string, unknown>) => ({
        ...r,
        recipe_use_cases: ((r.recipe_use_cases as { id: string; name: string; sort_order: number }[]) || [])
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
      setRecipes(recipes as unknown as Recipe[]);
      setMilestones(milestonesRes.data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchBrandData() {
      const { data } = await supabase
        .from("brands")
        .select("id, brand_volume(current_discount_percent, lifetime_video_count, approved_video_count)")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();

      const vol = Array.isArray(data?.brand_volume)
        ? data.brand_volume[0]
        : data?.brand_volume;
      setUserDiscountPct(vol?.current_discount_percent ?? 0);
      setLifetimeCount(vol?.lifetime_video_count ?? 0);
      setApprovedCount(vol?.approved_video_count ?? 0);
      setBrandId(data?.id ?? null);

      if (data?.id) {
        const { data: pendingReq } = await supabase
          .from("tier_upgrade_requests")
          .select("id")
          .eq("brand_id", data.id)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();
        setHasPendingUpgrade(!!pendingReq);
      }
    }

    fetchBrandData();
  }, [user]);

  // Compute unlock state from admin-approved count
  const unlock: UnlockState = getUnlockState(approvedCount, milestones);
  const upgradeCheck = canRequestTierUpgrade(lifetimeCount, approvedCount, milestones);

  // Split recipes into unlocked and locked
  const unlockedRecipes = recipes.filter((r) => unlock.unlockedRecipeSlugs.has(r.slug));
  const lockedRecipes = recipes.filter((r) => !unlock.unlockedRecipeSlugs.has(r.slug));

  return (
    <div>
      {/* Next tier unlock card */}
      {unlock.nextMilestone ? (
        <div className="mb-8 bg-surface border border-accent/20 rounded-brand p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg">🔒</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-cream font-display font-bold text-sm">{unlock.nextMilestone.tier_name}</span>
                {unlock.nextMilestone.discount_percent > unlock.discountPct && (
                  <span className="text-accent text-xs font-medium">{unlock.nextMilestone.discount_percent}% off</span>
                )}
              </div>
            </div>
            <span className="text-cream-31 text-xs font-medium">
              {lifetimeCount}/{unlock.nextMilestone.min_videos} videos
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(100, (lifetimeCount / unlock.nextMilestone.min_videos) * 100)}%`,
                background: "linear-gradient(90deg, #eda4e8, #ddf073)",
              }}
            />
          </div>

          {/* Tier upgrade form */}
          {upgradeCheck.eligible && !hasPendingUpgrade && brandId && (
            <BuyPageUpgradeForm brandId={brandId} milestoneId={unlock.nextMilestone.id} onSubmitted={() => setHasPendingUpgrade(true)} />
          )}
          {hasPendingUpgrade && (
            <div className="p-3 rounded-brand bg-amber-500/10 border border-amber-500/20 mb-3">
              <p className="text-amber-400 text-xs font-medium">
                Proof submitted - waiting for review
              </p>
            </div>
          )}

          {/* Show what unlocks next */}
          {!upgradeCheck.eligible && (
            <div className="flex flex-wrap gap-2">
              {unlock.nextMilestone.unlocked_recipe_slugs.length > 0 && (
                unlock.nextMilestone.unlocked_recipe_slugs.map((slug) => (
                  <span key={slug} className="text-[10px] text-cream-31 bg-background px-2 py-1 rounded-full">
                    {getRecipeIcon(slug)} New recipe
                  </span>
                ))
              )}
              {unlock.nextMilestone.landscape_unlocked && !unlock.landscapeUnlocked && (
                <span className="text-[10px] text-cream-31 bg-background px-2 py-1 rounded-full">
                  16:9 landscape
                </span>
              )}
              {unlock.nextMilestone.unlocked_addons.map((addon) => (
                <span key={addon} className="text-[10px] text-cream-31 bg-background px-2 py-1 rounded-full">
                  {addon.replace(/_/g, " ")}
                </span>
              ))}
              {unlock.nextMilestone.perks.filter((p) => !p.label.includes("discount") && p.category === "support").map((perk) => (
                <span key={perk.label} className="text-[10px] text-cream-31 bg-background px-2 py-1 rounded-full">
                  {perk.icon} {perk.label}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8 bg-surface border border-lime/20 rounded-brand p-5 flex items-center gap-3">
          <span className="text-lg">🔓</span>
          <div>
            <p className="text-cream font-display font-bold text-sm">You&apos;re a {unlock.tier}</p>
            <p className="text-lime text-xs">Maximum tier unlocked - {userDiscountPct}% off everything, forever</p>
          </div>
        </div>
      )}

      {/* Recipe Grid */}
      <h2 className="font-display font-bold text-xl text-cream mb-6">
        Video Recipes
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-brand p-4 aspect-[9/16] animate-pulse"
              />
            ))
          : (
            <>
              {/* Unlocked recipes - full cards */}
              {unlockedRecipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  hover
                  className="flex flex-col p-4"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={getOverallDifficulty(recipe.filming_difficulty, recipe.editing_difficulty) === "simple" ? "lime" : "accent"}>
                      {getOverallDifficulty(recipe.filming_difficulty, recipe.editing_difficulty)}
                    </Badge>
                    <span className="text-cream-31 text-[10px]">
                      {recipe.turnaround_days}d
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-cream mb-1 leading-tight">
                    <span className="mr-1">{getRecipeIcon(recipe.slug)}</span>{recipe.name}
                  </h3>
                  <p className="text-cream-61 text-xs mb-2 line-clamp-2">
                    {recipe.description}
                  </p>

                  {recipe.recipe_use_cases.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {recipe.recipe_use_cases.map((uc) => (
                        <span
                          key={uc.id}
                          className="text-[10px] text-cream-61 bg-background/80 border border-border px-1.5 py-0.5 rounded-full"
                        >
                          {uc.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {recipe.example_video_url && (
                    <div
                      className="mb-3 rounded-xl overflow-hidden bg-black aspect-[9/16]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <iframe
                        src={getEmbedUrl(recipe.example_video_url)}
                        className="w-full h-full border-0"
                        allowFullScreen
                        loading="lazy"
                        allow="autoplay; encrypted-media; picture-in-picture"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div>
                      {userDiscountPct > 0 && (
                        <span className="font-display text-xs text-cream-31 line-through block">
                          &euro;{(recipe.price_cents / 100).toFixed(0)}
                        </span>
                      )}
                      <span className="font-display font-bold text-lg text-cream">
                        &euro;{(applyDiscount(recipe.price_cents) / 100).toFixed(0)}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecipe(recipe);
                      }}
                    >
                      +
                    </Button>
                  </div>
                </Card>
              ))}

              {/* Locked recipes - teaser cards */}
              {lockedRecipes.map((recipe) => {
                const videosNeeded = recipe.min_tier_videos - lifetimeCount;
                return (
                  <Card
                    key={recipe.id}
                    className="flex flex-col p-4 relative overflow-hidden opacity-70"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="default">locked</Badge>
                      <span className="text-lg">🔒</span>
                    </div>

                    <h3 className="font-display font-bold text-sm text-cream mb-1 leading-tight">
                      <span className="mr-1">{getRecipeIcon(recipe.slug)}</span>{recipe.name}
                    </h3>

                    {/* Blurred placeholder for description */}
                    <div className="select-none blur-[6px] pointer-events-none">
                      <p className="text-cream-61 text-xs mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                      <div className="h-8 bg-surface rounded-brand" />
                    </div>

                    {/* Unlock CTA */}
                    <div className="mt-auto pt-4 text-center">
                      <p className="text-accent text-xs font-medium">
                        Post {videosNeeded} more video{videosNeeded !== 1 ? "s" : ""} to unlock
                      </p>
                    </div>
                  </Card>
                );
              })}

              {/* Request Custom Video card - only if unlocked */}
              {unlock.customRequestsUnlocked ? (
                <Card
                  hover
                  className="border-dashed border-accent/30 flex flex-col items-center justify-center text-center p-4"
                  onClick={() => router.push("/custom-request")}
                >
                  <div className="text-accent text-3xl mb-2">+</div>
                  <h3 className="font-display font-bold text-sm text-cream mb-1">
                    Got something weird in mind?
                  </h3>
                  <p className="text-cream-31 text-xs">
                    Send us a brief. We don&apos;t judge. We just edit.
                  </p>
                </Card>
              ) : (
                <Card className="border-dashed border-border flex flex-col items-center justify-center text-center p-4 opacity-50">
                  <span className="text-2xl mb-2">🔒</span>
                  <h3 className="font-display font-bold text-sm text-cream mb-1">
                    Custom Requests
                  </h3>
                  <p className="text-cream-31 text-xs">Locked</p>
                </Card>
              )}
            </>
          )}
      </div>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        userDiscountPct={userDiscountPct}
        unlockState={unlock}
        milestones={milestones}
      />
    </div>
  );
}

function BuyPageUpgradeForm({
  brandId,
  milestoneId,
  onSubmitted,
}: {
  brandId: string;
  milestoneId: string;
  onSubmitted: () => void;
}) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
      onSubmitted();
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-brand bg-background border border-accent/20 mb-3">
      <p className="text-cream text-xs font-medium mb-2">
        Ready to level up? Paste a link to a video you&apos;ve posted.
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
