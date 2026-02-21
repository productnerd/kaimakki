"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRecipeIcon } from "@/lib/constants";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RecipeDetailModal from "@/components/recipes/RecipeDetailModal";
import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";

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
  example_video_url: string | null;
};

type Bundle = {
  name: string;
  description: string;
  items: { recipeId: string; recipeName: string; quantity: number }[];
};

const BUNDLES: Bundle[] = [
  {
    name: "Personal Brand Starter",
    description:
      "4 videos to make you look like you have your life together. No excuses.",
    items: [
      { recipeId: "6982115e-5a12-4b39-879b-685f83347a99", recipeName: "Talking Head Reel", quantity: 2 },
      { recipeId: "7f1fd5c9-58d4-4934-a880-a1894575836a", recipeName: "Educational / Myth-Buster", quantity: 1 },
      { recipeId: "986f3f84-4d28-4ab2-9b06-cfb81e5aabe1", recipeName: "Behind-the-Scenes", quantity: 1 },
    ],
  },
  {
    name: "Product Launch Pack",
    description: "Launch day is coming. 4 videos so your product doesn't launch into the void.",
    items: [
      { recipeId: "ba0b3663-6331-4f39-8057-48c03a8f2390", recipeName: "Product Showcase", quantity: 2 },
      { recipeId: "f7ac6c3f-fede-4c4e-b33f-da9a278b78ce", recipeName: "Testimonial / Social Proof", quantity: 1 },
      { recipeId: "7f1fd5c9-58d4-4934-a880-a1894575836a", recipeName: "Educational / Myth-Buster", quantity: 1 },
    ],
  },
  {
    name: "Content Machine",
    description: "One of everything. For people who actually want to show up consistently.",
    items: [
      { recipeId: "6982115e-5a12-4b39-879b-685f83347a99", recipeName: "Talking Head Reel", quantity: 1 },
      { recipeId: "7f1fd5c9-58d4-4934-a880-a1894575836a", recipeName: "Educational / Myth-Buster", quantity: 1 },
      { recipeId: "ba0b3663-6331-4f39-8057-48c03a8f2390", recipeName: "Product Showcase", quantity: 1 },
      { recipeId: "f7ac6c3f-fede-4c4e-b33f-da9a278b78ce", recipeName: "Testimonial / Social Proof", quantity: 1 },
      { recipeId: "986f3f84-4d28-4ab2-9b06-cfb81e5aabe1", recipeName: "Behind-the-Scenes", quantity: 1 },
    ],
  },
];

const RECIPE_PRICES: Record<string, number> = {
  "6982115e-5a12-4b39-879b-685f83347a99": 95,
  "7f1fd5c9-58d4-4934-a880-a1894575836a": 150,
  "ba0b3663-6331-4f39-8057-48c03a8f2390": 140,
  "f7ac6c3f-fede-4c4e-b33f-da9a278b78ce": 110,
  "986f3f84-4d28-4ab2-9b06-cfb81e5aabe1": 150,
  "be9b4c37-5d46-4391-bc83-ae13a188ec83": 180,
};

const DISCOUNT_TIERS = [
  { min: 12, pct: 20 },
  { min: 8, pct: 15 },
  { min: 3, pct: 10 },
];

const TIER_LADDER = [
  { name: "Rookie", min: 1, pct: 0, perks: ["Dashboard access", "Standard delivery"] },
  { name: "Regular", min: 3, pct: 10, perks: ["10% off forever", "WhatsApp access"] },
  { name: "Hustler", min: 8, pct: 15, perks: ["15% off forever", "Priority queue", "Extra revision"] },
  { name: "Legend", min: 12, pct: 20, perks: ["20% off forever", "Strategy session", "Analytics roast"] },
];

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
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [addingBundle, setAddingBundle] = useState<string | null>(null);
  const [userDiscountPct, setUserDiscountPct] = useState(0);
  const [lifetimeCount, setLifetimeCount] = useState(0);
  const { addItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  function getBundleVideoCount(bundle: Bundle): number {
    return bundle.items.reduce((n, i) => n + i.quantity, 0);
  }

  function getBundleDiscountPct(bundle: Bundle): number {
    const count = getBundleVideoCount(bundle);
    for (const tier of DISCOUNT_TIERS) {
      if (count >= tier.min) return tier.pct;
    }
    return 0;
  }

  function getBundleTotal(bundle: Bundle): number {
    return bundle.items.reduce(
      (sum, item) => sum + (RECIPE_PRICES[item.recipeId] ?? 0) * item.quantity,
      0
    );
  }

  function getEffectiveBundlePct(bundle: Bundle): number {
    return Math.max(userDiscountPct, getBundleDiscountPct(bundle));
  }

  function getEffectiveBundleTotal(bundle: Bundle): number {
    const total = getBundleTotal(bundle);
    return Math.round(total * (1 - getEffectiveBundlePct(bundle) / 100));
  }

  function applyDiscount(cents: number): number {
    return Math.round(cents * (1 - userDiscountPct / 100));
  }

  async function handleAddBundle(bundle: Bundle) {
    setAddingBundle(bundle.name);
    for (const item of bundle.items) {
      for (let i = 0; i < item.quantity; i++) {
        await addItem(item.recipeId);
      }
    }
    setAddingBundle(null);
  }

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("video_recipes")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setRecipes(data || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("brands")
      .select("brand_volume(current_discount_percent, lifetime_video_count)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const vol = Array.isArray(data?.brand_volume)
          ? data.brand_volume[0]
          : data?.brand_volume;
        setUserDiscountPct(vol?.current_discount_percent ?? 0);
        setLifetimeCount(vol?.lifetime_video_count ?? 0);
      });
  }, [user]);

  async function handleAddToCart(e: React.MouseEvent, recipeId: string) {
    e.stopPropagation();
    await addItem(recipeId);
  }

  // Tier progress computation
  const currentTierIdx = (() => {
    let idx = 0;
    for (let i = TIER_LADDER.length - 1; i >= 0; i--) {
      if (lifetimeCount >= TIER_LADDER[i].min) { idx = i; break; }
    }
    return idx;
  })();
  const nextTier = currentTierIdx < TIER_LADDER.length - 1 ? TIER_LADDER[currentTierIdx + 1] : null;
  const progressPct = (() => {
    if (!nextTier) return 100;
    return Math.min(100, Math.max(0, (lifetimeCount / nextTier.min) * 100));
  })();

  return (
    <div>
      {/* Next tier unlock card */}
      {nextTier ? (
        <div className="mb-8 bg-surface border border-accent/20 rounded-brand p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg">🔒</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-cream font-display font-bold text-sm">{nextTier.name}</span>
                <span className="text-accent text-xs font-medium">{nextTier.pct}% off</span>
              </div>
            </div>
            <span className="text-cream-31 text-xs font-medium">
              {lifetimeCount}/{nextTier.min} videos
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #eda4e8, #ddf073)",
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {nextTier.perks.map((perk) => (
              <span key={perk} className="text-[10px] text-cream-31 bg-background px-2 py-1 rounded-full">
                {perk}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-8 bg-surface border border-lime/20 rounded-brand p-5 flex items-center gap-3">
          <span className="text-lg">🔓</span>
          <div>
            <p className="text-cream font-display font-bold text-sm">You&apos;re a Legend</p>
            <p className="text-lime text-xs">Maximum tier unlocked — {userDiscountPct}% off everything, forever</p>
          </div>
        </div>
      )}

      {/* Bundles */}
      <div className="mb-12">
        <h2 className="font-display font-bold text-xl text-cream mb-2">
          Bundles
        </h2>
        <p className="text-cream-31 text-sm mb-6">
          Commit to more. Save more. Procrastinate less.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BUNDLES.map((bundle) => (
            <Card
              key={bundle.name}
              className="border-accent/30 flex flex-col"
            >
              <Badge variant="accent" className="uppercase tracking-wide self-start mb-3">
                {getBundleVideoCount(bundle)} videos
              </Badge>

              <h3 className="font-display font-bold text-lg text-cream mb-2">
                {bundle.name}
              </h3>
              <p className="text-cream-61 text-sm mb-4">
                {bundle.description}
              </p>

              <ul className="text-cream-78 text-sm space-y-1 mb-6">
                {bundle.items.map((item) => (
                  <li key={item.recipeId}>
                    {item.quantity > 1 ? `${item.quantity}x ` : ""}
                    {item.recipeName}
                  </li>
                ))}
              </ul>

              <div className="mt-auto space-y-4">
                <div>
                  {getEffectiveBundlePct(bundle) > 0 && (
                    <span className="font-display text-sm text-cream-31 line-through block">
                      &euro;{getBundleTotal(bundle)}
                    </span>
                  )}
                  <span className="font-display font-bold text-2xl text-cream">
                    &euro;{getEffectiveBundleTotal(bundle)}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  size="md"
                  loading={addingBundle === bundle.name}
                  onClick={() => handleAddBundle(bundle)}
                >
                  Add all to cart
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recipe Grid */}
      <h2 className="font-display font-bold text-xl text-cream mb-6">
        Individual Recipes
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-brand p-4 aspect-[9/16] animate-pulse"
              />
            ))
          : (
            <>
              {recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  hover
                  className="flex flex-col p-4"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={recipe.complexity === "simple" ? "lime" : "accent"}>
                      {recipe.complexity}
                    </Badge>
                    <span className="text-cream-31 text-[10px]">
                      {recipe.turnaround_days}d
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-cream mb-1 leading-tight">
                    <span className="mr-1">{getRecipeIcon(recipe.slug)}</span>{recipe.name}
                  </h3>
                  <p className="text-cream-61 text-xs mb-3 line-clamp-2">
                    {recipe.description}
                  </p>

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
                      onClick={(e) => handleAddToCart(e, recipe.id)}
                    >
                      Add to cart
                    </Button>
                  </div>
                </Card>
              ))}

              {/* Request Custom Video card */}
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
            </>
          )}
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
