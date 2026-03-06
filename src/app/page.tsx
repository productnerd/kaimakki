"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRecipeIcon } from "@/lib/constants";
import { getUnlockState, getRecipeUnlockMilestone, getEffectiveDuration, getTierIndex, type Milestone } from "@/lib/unlocks";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RecipeDetailModal from "@/components/recipes/RecipeDetailModal";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VERTICALS, VERTICAL_SLUGS } from "@/lib/verticals";

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
  example_video_url: string | null;
  example_thumbnail_url: string | null;
  creative_surcharge_percent: number;
  example_urls: string[];
  recipe_use_cases: { id: string; name: string }[];
  recipe_addons?: { id: string; addon_key: string; label: string; sublabel: string | null; price_cents: number; unlock_addon_key: string | null; unlock_requires_landscape: boolean; sort_order: number }[];
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

function getThumbnailUrl(recipe: Recipe): string | null {
  if (recipe.example_thumbnail_url) return recipe.example_thumbnail_url;
  if (!recipe.example_video_url) return null;
  const shortsMatch = recipe.example_video_url.match(/youtube\.com\/shorts\/([^/?]+)/);
  if (shortsMatch) return `https://img.youtube.com/vi/${shortsMatch[1]}/hqdefault.jpg`;
  const watchMatch = recipe.example_video_url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watchMatch) return `https://img.youtube.com/vi/${watchMatch[1]}/hqdefault.jpg`;
  return null;
}

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [userDiscountPct, setUserDiscountPct] = useState(0);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const { user, profile } = useAuth();
  const router = useRouter();

  function applyDiscount(cents: number): number {
    return Math.round(cents * (1 - userDiscountPct / 100));
  }

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("video_recipes")
      .select("*, recipe_use_cases(id, name, sort_order), recipe_addons(id, addon_key, label, sublabel, price_cents, unlock_addon_key, unlock_requires_landscape, sort_order)")
      .eq("is_active", true)
      .eq("recipe_type", "video")
      .order("sort_order")
      .then(({ data }) => {
        // Sort use cases by sort_order within each recipe
        const recipes = (data || []).map((r: Record<string, unknown>) => ({
          ...r,
          recipe_use_cases: ((r.recipe_use_cases as { id: string; name: string; sort_order: number }[]) || [])
            .sort((a, b) => a.sort_order - b.sort_order),
        }));
        setRecipes(recipes as unknown as Recipe[]);
        setLoading(false);
      });
    supabase
      .from("unlock_milestones")
      .select("*")
      .order("min_videos")
      .then(({ data }) => setMilestones((data ?? []) as Milestone[]));
  }, []);

  useEffect(() => {
    if (!user) {
      setUserDiscountPct(0);
      setApprovedCount(0);
      return;
    }
    const supabase = createClient();
    supabase
      .from("brands")
      .select("brand_volume(current_discount_percent, approved_video_count)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const vol = Array.isArray(data?.brand_volume)
          ? data.brand_volume[0]
          : data?.brand_volume;
        setUserDiscountPct(vol?.current_discount_percent ?? 0);
        setApprovedCount(vol?.approved_video_count ?? 0);
      });
  }, [user]);

  const unlock = milestones.length > 0
    ? getUnlockState(user ? approvedCount : 0, milestones)
    : null;
  const tierIndex = unlock ? getTierIndex(unlock.tier, milestones) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {profile?.is_admin && (
        <div className="flex justify-end mb-4">
          <Link href="/admin/recipes" className="text-xs text-cream-31 hover:text-cream transition-colors">
            Admin: View all recipes &rarr;
          </Link>
        </div>
      )}
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="font-display font-black text-4xl md:text-6xl text-cream mb-4 tracking-tight">
          The more you post,<br />
          <span className="text-accent">the less you pay.</span>
        </h1>
        <p className="text-cream-61 text-lg max-w-2xl mx-auto mb-6">
          Pick a recipe, send footage, get scroll-stopping videos.
          The more you order, you unlock up to 25% lifetime discount + perks.
          If you sit on your content for over a month? We donate your prepayment to charity. You&apos;re welcome.
        </p>
        <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-brand px-5 py-3">
          <span className="text-lime text-sm font-medium">The deal:</span>
          <span className="text-cream-61 text-sm">
            Pick <span className="text-accent font-medium">three</span> video recipes &rarr; Pay upfront &rarr; You film &rarr; Send us footage &rarr; Our humans edit &rarr; You post (or we donate your money)
          </span>
        </div>
      </div>

      {/* Pick three CTA for visitors */}
      {!user && (
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-2xl text-cream">
            Pick three.
          </h2>
        </div>
      )}

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-brand p-4 aspect-[9/16] animate-pulse"
              />
            ))
          : (
            <>
              {recipes.map((recipe) => {
                const isLocked = unlock ? !unlock.unlockedRecipeSlugs.has(recipe.slug) : false;
                const unlockMs = isLocked ? getRecipeUnlockMilestone(recipe.slug, milestones) : null;
                const videosToGo = unlockMs ? Math.max(0, unlockMs.min_videos - (user ? approvedCount : 0)) : 0;
                const effectiveDuration = getEffectiveDuration(recipe.base_output_seconds, tierIndex);
                const hasDurationBoost = !!user && tierIndex > 0;
                const thumbnail = getThumbnailUrl(recipe);

                return (
                <Card
                  key={recipe.id}
                  hover={!isLocked}
                  className={`group relative aspect-[9/16] overflow-hidden !p-0 ${isLocked ? "opacity-60" : ""}`}
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  {/* Background layer */}
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnail}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-surface via-surface/90 to-background" />
                  )}

                  {/* Top gradient overlay */}
                  <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-black/70 to-transparent z-[1]" />

                  {/* Bottom gradient overlay */}
                  <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-[1]" />

                  {/* Hover overlay for locked recipes */}
                  {isLocked && unlockMs && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/85 rounded-brand z-10 pointer-events-none">
                      <div className="text-center px-4">
                        <p className="text-accent text-sm font-bold">
                          🔒 Unlocks at {unlockMs.tier_name}
                        </p>
                        <p className="text-cream-61 text-xs mt-1">
                          {user
                            ? `${videosToGo} more video${videosToGo !== 1 ? "s" : ""} to go`
                            : `${unlockMs.min_videos} videos posted`
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Content overlay */}
                  <div className="absolute inset-0 p-4 flex flex-col z-[2]">
                    {/* Top: badge + stats */}
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={getOverallDifficulty(recipe.filming_difficulty, recipe.editing_difficulty) === "simple" ? "lime" : "accent"}>
                        {getOverallDifficulty(recipe.filming_difficulty, recipe.editing_difficulty)}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-white/70 text-[10px]">
                        {isLocked && <span className="text-sm leading-none">🔒</span>}
                        <span className={hasDurationBoost ? "text-lime" : ""}>{effectiveDuration}s</span>
                        <span>·</span>
                        <span>{recipe.turnaround_days}d</span>
                      </div>
                    </div>

                    {/* Top: name + description */}
                    <h3 className="font-display font-bold text-sm text-white mb-1 leading-tight">
                      <span className="mr-1">{getRecipeIcon(recipe.slug)}</span>{recipe.name}
                    </h3>
                    <p className="text-white/60 text-xs line-clamp-4">
                      {recipe.description}
                    </p>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Bottom: use cases, price, + button */}
                    <div className="mt-auto">
                      {recipe.recipe_use_cases.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {recipe.recipe_use_cases.map((uc) => (
                            <span
                              key={uc.id}
                              className="text-[10px] text-white/70 bg-white/10 border border-white/10 px-1.5 py-0.5 rounded-full"
                            >
                              {uc.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* One-away pill for signed-in users */}
                      {isLocked && user && videosToGo === 1 && (
                        <div className="mb-2">
                          <span className="text-[10px] text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                            Post one more video to unlock
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <div>
                          {userDiscountPct > 0 && (
                            <span className="font-display text-xs text-white/40 line-through block">
                              &euro;{Math.round(recipe.price_cents * (1 + (recipe.creative_surcharge_percent ?? 25) / 100) / 100)}
                            </span>
                          )}
                          <span className="font-display font-bold text-lg text-white">
                            &euro;{Math.round(applyDiscount(recipe.price_cents * (1 + (recipe.creative_surcharge_percent ?? 25) / 100)) / 100)}
                          </span>
                          <span className="text-white/40 text-[10px] block">
                            starting at &euro;{Math.round(applyDiscount(recipe.price_cents) / 100)}
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
                    </div>
                  </div>
                </Card>
                );
              })}

              {/* Request Custom Video card */}
              <Card
                hover
                className="border-dashed border-accent/30 flex flex-col items-center justify-center text-center p-4"
                onClick={() => {
                  if (!user) {
                    router.push("/auth/login");
                    return;
                  }
                  router.push("/custom-request");
                }}
              >
                <div className="text-accent text-3xl mb-2">+</div>
                <h3 className="font-display font-bold text-sm text-cream mb-1">
                  Got something weird in mind?
                </h3>
                <p className="text-cream-31 text-xs">
                  Send us a brief. We don&apos;t judge. We just edit.
                </p>
              </Card>
            </>
          )}
      </div>

      {/* Industries */}
      <div className="mt-16">
        <h2 className="font-display font-bold text-2xl text-cream mb-2">
          Not sure what you need?
        </h2>
        <p className="text-cream-31 text-sm mb-6">
          Pick your industry and we&apos;ll show you what works.
        </p>
        <div className="flex flex-wrap gap-3">
          {VERTICAL_SLUGS.map((slug) => (
            <Link
              key={slug}
              href={`/for/${slug}`}
              className="text-sm text-cream-61 bg-surface border border-border rounded-brand px-4 py-2 hover:border-accent/50 transition-colors"
            >
              {VERTICALS[slug].name}
            </Link>
          ))}
        </div>
      </div>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        userDiscountPct={userDiscountPct}
      />
    </div>
  );
}
