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

function getEmbedUrl(url: string): string {
  // YouTube Shorts: /shorts/VIDEO_ID → /embed/VIDEO_ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^/?]+)/);
  if (shortsMatch) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&mute=1&loop=1&controls=0&playlist=${shortsMatch[1]}`;
  }
  // YouTube regular: /watch?v=VIDEO_ID → /embed/VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&mute=1&controls=0`;
  }
  // Fallback: append /embed/
  return url.replace(/\/?$/, "/embed/");
}

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [addingBundle, setAddingBundle] = useState<string | null>(null);
  const [userDiscountPct, setUserDiscountPct] = useState(0);
  const { addItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  // Map recipe IDs to their price in euros for bundle totals
  const RECIPE_PRICES: Record<string, number> = {
    "6982115e-5a12-4b39-879b-685f83347a99": 95,
    "7f1fd5c9-58d4-4934-a880-a1894575836a": 150,
    "ba0b3663-6331-4f39-8057-48c03a8f2390": 140,
    "f7ac6c3f-fede-4c4e-b33f-da9a278b78ce": 110,
    "986f3f84-4d28-4ab2-9b06-cfb81e5aabe1": 150,
    "be9b4c37-5d46-4391-bc83-ae13a188ec83": 180,
  };

  // Discount tiers: 3+ = 10%, 8+ = 15%, 12+ = 20%
  const DISCOUNT_TIERS = [
    { min: 12, pct: 20 },
    { min: 8, pct: 15 },
    { min: 3, pct: 10 },
  ];

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

  // Effective discount: the higher of the user's personal tier or the bundle's volume tier
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
    if (!user) {
      router.push("/auth/login");
      return;
    }
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
    if (!user) {
      setUserDiscountPct(0);
      return;
    }
    const supabase = createClient();
    supabase
      .from("brands")
      .select("brand_volume(current_discount_percent)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const vol = Array.isArray(data?.brand_volume)
          ? data.brand_volume[0]
          : data?.brand_volume;
        setUserDiscountPct(vol?.current_discount_percent ?? 0);
      });
  }, [user]);

  async function handleAddToCart(e: React.MouseEvent, recipeId: string) {
    e.stopPropagation();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    await addItem(recipeId);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
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
            Pay upfront &rarr; We send you instructions &rarr; You film &rarr; Send us footage &rarr; Our humans edit &rarr; You post &rarr; Repeat (or we donate your money)
          </span>
        </div>
      </div>

      {/* Bundles */}
      <div className="mb-16">
        <h2 className="font-display font-bold text-2xl text-cream mb-2">
          Bundles
        </h2>
        <p className="text-cream-31 text-sm mb-6">
          Commit to more. Save more. Procrastinate less. (Seriously, the charity thing is real.)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BUNDLES.map((bundle) => (
            <Card
              key={bundle.name}
              className="border-accent/30 flex flex-col"
            >
              <Badge variant="accent" className="uppercase tracking-wide self-start mb-3">
                {bundle.items.reduce((n, i) => n + i.quantity, 0)} videos
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

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        userDiscountPct={userDiscountPct}
      />
    </div>
  );
}
