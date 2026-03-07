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
  const [bundleModes, setBundleModes] = useState<Record<string, "donkey" | "creative">>({});
  const { user } = useAuth();
  const { addBundle } = useCart();

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

  const starterRecipes = pickBundleRecipes(4);
  const advancedRecipes = pickBundleRecipes(8);

  const bundles = [
    { name: "Starter Bundle", recipes: starterRecipes, description: meta.starterDescription },
    { name: "Advanced Bundle", recipes: advancedRecipes, description: meta.advancedDescription },
  ];

  function bundleDonkeyTotal(rs: Recipe[]): number {
    return Math.round(rs.reduce((s, r) => s + r.price_cents, 0) / 100);
  }

  function bundleCreativeTotal(rs: Recipe[]): number {
    return Math.round(rs.reduce((s, r) => s + Math.round(r.price_cents * (1 + (r.creative_surcharge_percent ?? 25) / 100)), 0) / 100);
  }

  async function handleAddBundle(rs: Recipe[], name: string) {
    const mode = bundleModes[name] ?? "donkey";
    setAddingBundle(name);
    await addBundle(rs.map((r) => r.id), name, 0, mode);
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
          <div className="flex justify-center mb-3">
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
                            : `Post ${unlockMs.min_videos} more videos`
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

      {/* Pick three CTA + freebies */}
      {!loading && recipes.length > 0 && (
        <section className="mt-16 text-center">
          <h2 className="font-display font-bold text-2xl text-cream mb-3">
            Pick <span className="text-accent font-medium">3+</span> videos to get started
          </h2>
          <p className="text-cream-61 text-sm mb-8 max-w-lg mx-auto">
            Your first order comes with two free sessions to make sure you actually know what you&apos;re doing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="rounded-brand border border-dashed border-accent/30 bg-accent/5 p-5 text-left">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-sm text-cream">
                  <span className="mr-1.5">🧠</span>1-on-1 Content Strategy Session
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xs text-cream-31 line-through">&euro;150</span>
                  <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded-full font-medium">FREE</span>
                </div>
              </div>
              <ul className="text-cream-61 text-xs space-y-1.5">
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Content pillars definition</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Audience definition &amp; targeting</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Topic &amp; video ideas list</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Posting cadence &amp; schedule</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Platform strategy</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Competitor &amp; trend analysis</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Hook &amp; CTA frameworks</li>
              </ul>
            </div>
            <div className="rounded-brand border border-dashed border-accent/30 bg-accent/5 p-5 text-left">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-sm text-cream">
                  <span className="mr-1.5">🎨</span>Video Branding Guidelines
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xs text-cream-31 line-through">&euro;150</span>
                  <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded-full font-medium">FREE</span>
                </div>
              </div>
              <ul className="text-cream-61 text-xs space-y-1.5">
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Brand voice &amp; communication style</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Visual style &amp; colour palette</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Typography &amp; text treatments</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Animation &amp; transition style</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Image &amp; footage direction</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Pacing &amp; rhythm guidelines</li>
                <li className="flex items-start gap-1.5"><span className="text-accent">✓</span>Music &amp; sound direction</li>
              </ul>
            </div>
          </div>
          <p className="text-cream-31 text-[10px] mt-3">&euro;300 value — included free with your first order of 3+ videos</p>
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
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display font-bold text-lg text-cream">
                      {bundle.name}
                    </h3>
                    <Badge variant="accent">{bundle.recipes.length} videos</Badge>
                  </div>
                  <p className="text-cream-61 text-sm">{bundle.description}</p>
                </div>

                {/* Recipe cards grid — same card as main grid, no price/+ button */}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
                  {bundle.recipes.map((recipe) => {
                    const thumbnail = getThumbnailUrl(recipe);
                    const effectiveDuration = getEffectiveDuration(recipe.base_output_seconds, tierIndex);
                    const hasDurationBoost = !!user && tierIndex > 0;

                    return (
                      <div
                        key={recipe.id}
                        className="relative aspect-[9/16] overflow-hidden rounded-brand bg-surface border border-border cursor-pointer hover:border-accent/50 transition-colors"
                        onClick={() => setSelectedRecipe(recipe)}
                      >
                        {/* Background */}
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

                        {/* Top gradient */}
                        <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-black/70 to-transparent z-[1]" />

                        {/* Bottom gradient */}
                        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-[1]" />

                        {/* Content overlay — same structure as main grid */}
                        <div className="absolute inset-0 p-3 flex flex-col z-[2]">
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

                          {/* Name */}
                          <h4 className="font-display font-bold text-xs text-white leading-tight">
                            <span className="mr-1">{getRecipeIcon(recipe.slug)}</span>
                            {recipe.name}
                          </h4>

                          {/* Spacer */}
                          <div className="flex-1" />

                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mode picker + price + add button */}
                <div className="pt-4 border-t border-border/50">
                  <div className="flex gap-3 mb-4">
                    {([
                      { mode: "creative" as const, label: "🎬 Full Production", desc: "We handle the creative direction" },
                      { mode: "donkey" as const, label: "🫏 Donkey", desc: "You direct, we edit" },
                    ]).map((opt) => {
                      const selected = (bundleModes[bundle.name] ?? "donkey") === opt.mode;
                      return (
                        <button
                          key={opt.mode}
                          onClick={() => setBundleModes((prev) => ({ ...prev, [bundle.name]: opt.mode }))}
                          className={`flex-1 rounded-brand p-3 text-left border transition-colors ${
                            selected
                              ? "border-accent bg-accent/10"
                              : "border-border bg-surface hover:border-accent/30"
                          }`}
                        >
                          <span className="text-xs font-medium text-cream block">{opt.label}</span>
                          <span className="text-[10px] text-cream-31">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      {(bundleModes[bundle.name] ?? "donkey") === "creative" ? (
                        <>
                          <span className="font-display font-bold text-2xl text-cream">
                            &euro;{bundleCreativeTotal(bundle.recipes)}
                          </span>
                          <span className="text-cream-31 text-[10px] block">
                            starting at &euro;{bundleDonkeyTotal(bundle.recipes)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-display font-bold text-2xl text-cream">
                            &euro;{bundleDonkeyTotal(bundle.recipes)}
                          </span>
                          <span className="text-cream-31 text-[10px] block">
                            full production &euro;{bundleCreativeTotal(bundle.recipes)}
                          </span>
                        </>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={addingBundle === bundle.name}
                      onClick={() => handleAddBundle(bundle.recipes, bundle.name)}
                    >
                      Add bundle to cart
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="mt-16">
        <h2 className="font-display font-bold text-2xl text-cream mb-8">How it works</h2>
        <div className="max-w-2xl mx-auto">
          {/* Onboarding steps (linear) */}
          {[
            { icon: "🛒", title: "Pick your videos", desc: "Choose 3+ video recipes that fit your goals. Mix and match, or grab a bundle.", tag: null },
            { icon: "📋", title: "Fill in the questionnaire", desc: "Answer a few questions about your brand, audience, and goals so we know what we're working with.", tag: null },
            { icon: "🧠", title: "Strategy session + meet your account manager", desc: "A 1-on-1 call with a real human. We map out your content pillars, topics, posting cadence, and game plan. You also get a dedicated account manager and a direct channel — questions, feedback, weird requests — they've got you.", tag: "First order" },
            { icon: "📦", title: "Your strategy pack", desc: "After the session, you get your video branding guidelines (visual style, colours, animation, pacing, music direction), a content calendar, and all the video ideas — ready to go.", tag: "First order" },
          ].map((s, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-sm shrink-0">
                  {s.icon}
                </div>
                <div className="w-px flex-1 bg-border my-1" />
              </div>
              <div className="pb-6">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm text-cream">{s.title}</h3>
                  {s.tag && (
                    <span className="text-[9px] text-accent bg-accent/10 border border-accent/30 px-1.5 py-0.5 rounded-full">{s.tag}</span>
                  )}
                </div>
                <p className="text-cream-61 text-xs mt-1">{s.desc}</p>
              </div>
            </div>
          ))}

          {/* Repeat loop */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-px bg-border" style={{ height: 8 }} />
            </div>
            <div />
          </div>
          <div className="relative ml-4 border border-accent/20 rounded-brand p-5 pl-8 mb-2">
            {/* Loop label */}
            <div className="absolute -top-3 left-4 bg-accent/10 border border-accent/30 rounded-full px-3 py-0.5">
              <span className="text-[10px] text-accent font-medium">↩ Pick more videos &amp; repeat</span>
            </div>

            {[
              { icon: "🎬", title: "Film your footage", desc: "We send you a shot list for each video. You film on your phone. No fancy gear needed." },
              { icon: "📤", title: "Send us the footage", desc: "Upload your clips. We take it from here." },
              { icon: "✂️", title: "We edit", desc: "Our editors turn your footage into scroll-stoppers using your branding guidelines." },
              { icon: "🔄", title: "Review + 1 free revision", desc: "Watch your video. Don't love something? Give feedback and we'll revise it once — on us." },
              { icon: "🚀", title: "You post (or else)", desc: "Get your final video and post it within 30 days. Ghost us? We donate part of your prepayment to charity. You're welcome." },
            ].map((s, i, arr) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-sm shrink-0">
                    {s.icon}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px flex-1 bg-accent/20 my-1" />
                  )}
                </div>
                <div className={i < arr.length - 1 ? "pb-5" : ""}>
                  <h3 className="font-display font-bold text-sm text-cream">{s.title}</h3>
                  <p className="text-cream-61 text-xs mt-1">{s.desc}</p>
                </div>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* Other verticals — ticker */}
      <section className="mt-16">
        <h2 className="font-display font-bold text-2xl text-cream mb-6">
          Explore other industries
        </h2>
        <div className="overflow-hidden">
          <div className="flex animate-ticker w-max gap-4 hover:[animation-play-state:paused]">
            {[...VERTICAL_SLUGS.filter((s) => s !== vertical), ...VERTICAL_SLUGS.filter((s) => s !== vertical)].map((slug, i) => (
              <Link
                key={`${slug}-${i}`}
                href={`/for/${slug}`}
                className="flex items-center gap-2 text-sm text-cream-61 bg-surface border border-border rounded-brand px-4 py-2.5 hover:border-accent/50 hover:text-cream transition-colors whitespace-nowrap shrink-0"
              >
                <span>{VERTICALS[slug].icon}</span>
                {VERTICALS[slug].name}
              </Link>
            ))}
          </div>
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
