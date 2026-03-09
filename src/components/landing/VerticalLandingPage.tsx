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
import HowItWorks from "@/components/landing/HowItWorks";

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
        .select("*, recipe_use_cases(id, name, sort_order), recipe_addons(id, addon_key, label, sublabel, price_cents, price_percent, max_quantity, unlock_addon_key, unlock_requires_landscape, sort_order)")
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

  // Calculate bundle price with tier discounts applied (same logic as cart)
  function bundleWithTierDiscount(rs: Recipe[], mode: "donkey" | "creative"): { total: number; beforeDiscount: number; savedCount: number } {
    const baseApproved = user ? approvedCount : 0;

    // Get per-item price
    const prices = rs.map((r) =>
      mode === "creative"
        ? Math.round(r.price_cents * (1 + (r.creative_surcharge_percent ?? 25) / 100))
        : r.price_cents
    );

    // Calculate discount slot for each position
    const slots = rs.map((_, i) => {
      const videoNumber = baseApproved + i + 1;
      let pct = 0;
      for (const ms of milestones) {
        if (videoNumber >= ms.min_videos) pct = Math.max(pct, ms.discount_percent);
      }
      return pct;
    });

    // Assign highest discounts to most expensive items
    const sortedSlots = [...slots].sort((a, b) => b - a);
    const indexed = prices.map((p, i) => ({ price: p, origIndex: i }));
    const byPrice = [...indexed].sort((a, b) => b.price - a.price);
    const assignedPcts = new Array<number>(rs.length).fill(0);
    byPrice.forEach((entry, rank) => {
      assignedPcts[entry.origIndex] = sortedSlots[rank] ?? 0;
    });

    const beforeDiscount = prices.reduce((s, p) => s + p, 0);
    const total = prices.reduce((s, p, i) => s + Math.round(p * (1 - assignedPcts[i] / 100)), 0);
    const savedCount = assignedPcts.filter((p) => p > 0).length;

    return { total: Math.round(total / 100), beforeDiscount: Math.round(beforeDiscount / 100), savedCount };
  }

  async function handleAddBundle(rs: Recipe[], name: string) {
    const mode = bundleModes[name] ?? "creative";
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
      <header className="mb-16">
        <div className="flex items-center gap-4 text-cream-61 mb-3">
          {/* Instagram */}
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          {/* TikTok */}
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z"/></svg>
          {/* YouTube */}
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          {/* LinkedIn */}
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          {/* X / Twitter */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </div>
        <p className="text-cream-31 text-xs uppercase tracking-widest mb-3">Social media videos made easy for {meta.name}</p>
        <h1 className="font-display font-black text-4xl md:text-6xl mb-4 tracking-tight">
          <span className="text-cream">Short videos online</span><br />
          <span className="text-accent">{meta.name}</span>
        </h1>
      </header>

      {/* Recipe grid */}
      <section>
        {!loading && recipes.length > 0 && (
          <div className="flex justify-center mb-3">
            <span className="text-xs text-cream-61 bg-surface border border-border rounded-full px-3 py-1.5 font-bold">⭐ Recommended for {meta.name}</span>
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
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            <div className="bg-background rounded-brand p-4 border border-dashed border-accent/30">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-cream text-sm">
                  <span className="mr-1">🧠</span>1-on-1 Content Strategy Session
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xs text-cream-31 line-through">&euro;150</span>
                  <span className="font-display font-bold text-cream">&euro;0</span>
                </div>
              </div>
            </div>
            <div className="bg-background rounded-brand p-4 border border-dashed border-accent/30">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-cream text-sm">
                  <span className="mr-1">🎨</span>Video Branding Guidelines
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xs text-cream-31 line-through">&euro;150</span>
                  <span className="font-display font-bold text-cream">&euro;0</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-cream-31 text-[10px] mt-3">&euro;300 value - included free with your first order of 3+ videos</p>
        </section>
      )}

      {/* Industry bundles */}
      {!loading && starterRecipes.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display font-bold text-2xl text-cream mb-6">
            Can&apos;t decide?<br />
            Pick our recommended {meta.name} bundle
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

                {/* Recipe cards grid - same card as main grid, no price/+ button */}
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

                        {/* Content overlay - same structure as main grid */}
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
                      const selected = (bundleModes[bundle.name] ?? "creative") === opt.mode;
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
                    {(() => {
                      const mode = (bundleModes[bundle.name] ?? "creative");
                      const selected = bundleWithTierDiscount(bundle.recipes, mode);
                      const other = bundleWithTierDiscount(bundle.recipes, mode === "creative" ? "donkey" : "creative");
                      const hasTierDiscount = selected.total < selected.beforeDiscount;
                      return (
                        <div>
                          <div className="flex items-center gap-2">
                            {hasTierDiscount && (
                              <span className="font-display text-sm text-cream-31 line-through">
                                &euro;{selected.beforeDiscount}
                              </span>
                            )}
                            <span className="font-display font-bold text-2xl text-cream">
                              &euro;{selected.total}
                            </span>
                            {hasTierDiscount && (
                              <span className="text-[10px] text-lime bg-lime/10 px-1.5 py-0.5 rounded-full">
                                {selected.savedCount} videos with tier discount
                              </span>
                            )}
                          </div>
                          <span className="text-cream-31 text-[10px] block">
                            {mode === "creative"
                              ? `starting at €${other.total}`
                              : `full production €${other.total}`
                            }
                          </span>
                        </div>
                      );
                    })()}
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

      <HowItWorks />

      {/* Other verticals - ticker */}
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
