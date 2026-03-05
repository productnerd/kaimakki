"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { VERTICALS, VERTICAL_SLUGS } from "@/lib/verticals";
import { getRecipeIcon } from "@/lib/constants";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RecipeDetailModal from "@/components/recipes/RecipeDetailModal";

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

export default function VerticalLandingPage({ vertical }: { vertical: string }) {
  const meta = VERTICALS[vertical];
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

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
    }

    load();
  }, [vertical]);

  if (!meta) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center">
        <h1 className="font-display font-bold text-2xl text-cream">Not found</h1>
      </div>
    );
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
        <p className="text-cream-61 text-lg max-w-2xl mx-auto mb-6">
          {meta.subtitle}
        </p>
        <Link href="/">
          <Button size="lg">Browse all recipes</Button>
        </Link>
      </header>

      {/* Recipe grid */}
      <section>
        <h2 className="font-display font-bold text-2xl text-cream mb-6">
          Recipes for {meta.name}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface border border-border rounded-brand p-4 aspect-[9/16] animate-pulse"
                />
              ))
            : recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  hover
                  className="flex flex-col p-4"
                  onClick={() => setSelectedRecipe(recipe)}
                >
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
                    <span className="text-cream-31 text-[10px]">{recipe.turnaround_days}d</span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-cream mb-1 leading-tight">
                    <span className="mr-1">{getRecipeIcon(recipe.slug)}</span>
                    {recipe.name}
                  </h3>
                  <p className="text-cream-61 text-xs mb-2 line-clamp-2">{recipe.description}</p>

                  {recipe.recipe_use_cases.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {recipe.recipe_use_cases.map((uc) => (
                        <span
                          key={uc.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            uc.isRecommended
                              ? "text-accent bg-accent/10 border border-accent/30"
                              : "text-cream-61 bg-background/80 border border-border"
                          }`}
                        >
                          {uc.isRecommended && <span className="mr-0.5">⭐</span>}
                          {uc.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="font-display font-bold text-lg text-cream">
                      &euro;{(recipe.price_cents / 100).toFixed(0)}
                    </span>
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
        </div>
        {!loading && recipes.length > 0 && (
          <p className="text-cream-31 text-xs mt-4">
            ⭐ = Recommended for {meta.name}
          </p>
        )}
      </section>

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

      {/* CTA */}
      <section className="mt-16 text-center">
        <h2 className="font-display font-bold text-2xl text-cream mb-4">
          Ready to start posting?
        </h2>
        <p className="text-cream-61 text-sm mb-6 max-w-lg mx-auto">
          Pick a recipe, send your footage, get back a scroll-stopping video.
          The more you post, the less you pay.
        </p>
        <Link href="/">
          <Button size="lg">Browse all recipes</Button>
        </Link>
      </section>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </div>
  );
}
