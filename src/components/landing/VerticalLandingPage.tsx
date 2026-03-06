"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { VERTICALS, VERTICAL_SLUGS } from "@/lib/verticals";
import { getRecipeIcon } from "@/lib/constants";
import { getUnlockState, getRecipeUnlockMilestone, getEffectiveDuration, getTierIndex, type Milestone } from "@/lib/unlocks";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RecipeDetailModal from "@/components/recipes/RecipeDetailModal";
import { useAuth } from "@/providers/AuthProvider";
import { useCart } from "@/providers/CartProvider";

type UseCase = { id: string; name: string; sort_order: number; isRecommended?: boolean };

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
  recipe_use_cases: { id: string; name: string; isRecommended?: boolean }[];
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

export default function VerticalLandingPage({ vertical }: { vertical: string }) {
  const meta = VERTICALS[vertical];
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [addingBundle, setAddingBundle] = useState<string | null>(null);
  const { user } = useAuth();
  const { addItem } = useCart();

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // Fetch vertical ID
      const { data: verticalRow } = await supabase
        .from("verticals")
        .select("id")
        .eq("slug", vertical)
        .single();

      if (!verticalRow) {
        setLoading(false);
        return;
      }

      // Fetch all use case → vertical mappings for this vertical
      const { data: ucVerticals } = await supabase
        .from("use_case_verticals")
        .select("use_case_id")
        .eq("vertical_id", verticalRow.id);

      const taggedUseCaseIds = new Set((ucVerticals ?? []).map((r: { use_case_id: string }) => r.use_case_id));

      // Fetch all active video recipes with their use cases
      const { data: rawRecipes } = await supabase
        .from("video_recipes")
        .select("*, recipe_use_cases(id, name, sort_order), recipe_addons(id, addon_key, label, sublabel, price_cents, unlock_addon_key, unlock_requires_landscape, sort_order)")
        .eq("is_active", true)
        .eq("recipe_type", "video")
        .order("sort_order");

      if (!rawRecipes) {
        setLoading(false);
        return;
      }

      // Show ALL recipes, but mark use cases tagged to this vertical as recommended
      // Sort: recommended use cases first within each recipe
      const result: Recipe[] = [];
      for (const r of rawRecipes) {
        const allUseCases = ((r.recipe_use_cases as UseCase[]) || []).sort(
          (a, b) => a.sort_order - b.sort_order
        );

        const withRecommended = allUseCases.map((uc) => ({
          id: uc.id,
          name: uc.name,
          isRecommended: taggedUseCaseIds.has(uc.id),
        }));

        // Sort: recommended first, then the rest
        withRecommended.sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));

        result.push({
          ...r,
          recipe_use_cases: withRecommended,
        } as Recipe);
      }

      setRecipes(result);
      setLoading(false);

      // Fetch milestones for lock indicators
      const { data: msData } = await supabase
        .from("unlock_milestones")
        .select("*")
        .order("min_videos");
      setMilestones((msData ?? []) as Milestone[]);
    }

    load();
  }, [vertical]);

  // Fetch approved_video_count for signed-in users
  useEffect(() => {
    if (!user) {
      setApprovedCount(0);
      return;
    }
    const supabase = createClient();
    supabase
      .from("brands")
      .select("brand_volume(approved_video_count)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const vol = Array.isArray(data?.brand_volume)
          ? data.brand_volume[0]
          : data?.brand_volume;
        setApprovedCount(vol?.approved_video_count ?? 0);
      });
  }, [user]);

  if (!meta) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center">
        <h1 className="font-display font-bold text-2xl text-cream">Not found</h1>
      </div>
    );
  }

  const unlock = milestones.length > 0
    ? getUnlockState(user ? approvedCount : 0, milestones)
    : null;
  const tierIndex = unlock ? getTierIndex(unlock.tier, milestones) : 0;

  // Derive recommended recipes for bundles
  const recommendedRecipes = recipes.filter((r) =>
    r.recipe_use_cases.some((uc) => uc.isRecommended)
  );
  const otherRecipes = recipes.filter(
    (r) => !r.recipe_use_cases.some((uc) => uc.isRecommended)
  );

  function pickBundleRecipes(count: number): Recipe[] {
    const picked = recommendedRecipes.slice(0, count);
    if (picked.length < count) picked.push(...otherRecipes.slice(0, count - picked.length));
    return picked;
  }

  const starterRecipes = pickBundleRecipes(5);
  const advancedRecipes = pickBundleRecipes(8);

  const bundles = [
    { name: "Starter Bundle", discountPct: 10, recipes: starterRecipes },
    { name: "Advanced Bundle", discountPct: 15, recipes: advancedRecipes },
  ];

  function bundleTotal(rs: Recipe[]): number {
    return Math.round(rs.reduce((s, r) => s + r.price_cents, 0) / 100);
  }

  function bundleDiscounted(rs: Recipe[], pct: number): number {
    return Math.round(bundleTotal(rs) * (1 - pct / 100));
  }

  async function handleAddBundle(rs: Recipe[], name: string) {
    setAddingBundle(name);
    for (const r of rs) await addItem(r.id);
    setAddingBundle(null);
  }

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: meta.headline,
    description: meta.metaDescription,
    url: `https://productnerd.github.io/kaimakki/for/${vertical}`,
    provider: {
      "@type": "Organization",
      name: "Kaimakki Studio",
      url: "https://productnerd.github.io/kaimakki",
    },
    serviceType: "Video Production",
    areaServed: "Worldwide",
    ...(recipes.length > 0 && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `Video recipes for ${meta.name}`,
        itemListElement: recipes.map((r) => ({
          "@type": "Offer",
          name: r.name,
          description: r.description,
          price: (r.price_cents / 100).toFixed(2),
          priceCurrency: "EUR",
        })),
      },
    }),
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <header className="text-center mb-16">
        <h1 className="font-display font-black text-4xl md:text-6xl text-cream mb-4 tracking-tight">
          {meta.headline}
        </h1>
        <p className="text-cream-61 text-lg max-w-2xl mx-auto">
          {meta.subtitle}
        </p>
      </header>

      {/* Recipe grid */}
      <section>
        {!loading && recipes.length > 0 && (
          <div className="flex justify-end mb-3">
            <p className="text-cream-31 text-xs">⭐ = Recommended for {meta.name}</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface border border-border rounded-brand p-4 aspect-[9/16] animate-pulse"
                />
              ))
            : recipes.map((recipe) => {
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
                      className={`absolute inset-0 w-full h-full object-cover ${isLocked ? "grayscale" : ""}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-b from-surface via-surface/90 to-background ${isLocked ? "grayscale" : ""}`} />
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
                      <Badge
                        variant={
                          getOverallDifficulty(recipe.filming_difficulty, recipe.editing_difficulty) === "simple"
                            ? "lime"
                            : "accent"
                        }
                      >
                        {getOverallDifficulty(recipe.filming_difficulty, recipe.editing_difficulty)}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-white/70 text-[10px]">
                        <span className={hasDurationBoost ? "text-lime" : ""}>{effectiveDuration}s</span>
                        <span>·</span>
                        <span>{recipe.turnaround_days}d</span>
                      </div>
                    </div>

                    {/* Top: name + description */}
                    <h3 className="font-display font-bold text-sm text-white mb-1 leading-tight">
                      <span className="mr-1">{isLocked ? "🔒" : getRecipeIcon(recipe.slug)}</span>
                      {recipe.name}
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
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                uc.isRecommended
                                  ? "text-accent bg-accent/10 border border-accent/30"
                                  : "text-white/70 bg-white/10 border border-white/10"
                              }`}
                            >
                              {uc.isRecommended && <span className="mr-0.5">⭐</span>}
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
                          <span className="font-display font-bold text-lg text-white">
                            &euro;{Math.round(recipe.price_cents * (1 + (recipe.creative_surcharge_percent ?? 25) / 100) / 100)}
                          </span>
                          <span className="text-white/40 text-[10px] block">
                            starting at &euro;{Math.round(recipe.price_cents / 100)}
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
        </div>
      </section>

      {/* Pick three CTA */}
      {!loading && recipes.length > 0 && (
        <section className="mt-16 text-center">
          <h2 className="font-display font-bold text-2xl text-cream">
            Pick <span className="text-accent font-medium">three</span> videos or a bundle to get started
          </h2>
        </section>
      )}

      {/* Industry bundles */}
      {!loading && starterRecipes.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display font-bold text-2xl text-cream mb-6">
            Can&apos;t decide? Pick a bundle
          </h2>
          <div className="flex flex-col gap-8">
            {bundles.map((bundle) => (
              <Card key={bundle.name} className="border-accent/30">
                {/* Bundle header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-display font-bold text-lg text-cream">
                      {bundle.name}
                    </h3>
                    <Badge variant="accent">{bundle.recipes.length} videos</Badge>
                    <Badge variant="lime">{bundle.discountPct}% off</Badge>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-sm text-cream-31 line-through block">
                      &euro;{bundleTotal(bundle.recipes)}
                    </span>
                    <span className="font-display font-bold text-2xl text-cream">
                      &euro;{bundleDiscounted(bundle.recipes, bundle.discountPct)}
                    </span>
                  </div>
                </div>

                {/* Mini recipe cards grid — no prices, no + button */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {bundle.recipes.map((recipe) => {
                    const thumb = getThumbnailUrl(recipe);
                    return (
                      <div
                        key={recipe.id}
                        className="relative aspect-[9/16] overflow-hidden rounded-brand bg-surface border border-border"
                      >
                        {/* Background */}
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-b from-surface via-surface/90 to-background" />
                        )}

                        {/* Top gradient */}
                        <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-black/70 to-transparent z-[1]" />

                        {/* Bottom gradient */}
                        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-[1]" />

                        {/* Content: badge + name only */}
                        <div className="absolute inset-0 p-3 flex flex-col z-[2]">
                          <Badge
                            variant={
                              getOverallDifficulty(recipe.filming_difficulty, recipe.editing_difficulty) === "simple"
                                ? "lime"
                                : "accent"
                            }
                          >
                            {getOverallDifficulty(recipe.filming_difficulty, recipe.editing_difficulty)}
                          </Badge>
                          <div className="flex-1" />
                          <h4 className="font-display font-bold text-xs text-white leading-tight">
                            <span className="mr-1">{getRecipeIcon(recipe.slug)}</span>
                            {recipe.name}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add bundle button */}
                <Button
                  variant="secondary"
                  className="w-full"
                  size="md"
                  loading={addingBundle === bundle.name}
                  onClick={() => handleAddBundle(bundle.recipes, bundle.name)}
                >
                  Add bundle to cart
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="mt-16">
        <h2 className="font-display font-bold text-2xl text-cream mb-6">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Pick a recipe", desc: "Choose a video template that fits your goal." },
            { step: "2", title: "Film your footage", desc: "We send you a shot list. You film on your phone." },
            { step: "3", title: "We edit", desc: "Our humans turn your footage into a scroll-stopper." },
            { step: "4", title: "You post", desc: "Get your video back and post it. Or we donate your money." },
          ].map((s) => (
            <article key={s.step} className="bg-surface border border-border rounded-brand p-5">
              <span className="font-display font-bold text-2xl text-accent">{s.step}</span>
              <h3 className="font-display font-bold text-sm text-cream mt-2 mb-1">{s.title}</h3>
              <p className="text-cream-61 text-xs">{s.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Other verticals */}
      <section className="mt-16">
        <h2 className="font-display font-bold text-2xl text-cream mb-6">
          Explore other industries
        </h2>
        <div className="flex flex-wrap gap-3">
          {VERTICAL_SLUGS.filter((s) => s !== vertical).map((slug) => (
            <Link
              key={slug}
              href={`/for/${slug}`}
              className="text-sm text-cream-61 bg-surface border border-border rounded-brand px-4 py-2 hover:border-accent/50 transition-colors"
            >
              {VERTICALS[slug].name}
            </Link>
          ))}
        </div>
      </section>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </div>
  );
}
