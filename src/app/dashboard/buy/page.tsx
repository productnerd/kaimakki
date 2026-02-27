"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRecipeIcon } from "@/lib/constants";
import { getUnlockState, canRequestTierUpgrade, type Milestone, type UnlockState } from "@/lib/unlocks";
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
  min_tier_videos: number;
  intake_form_schema: { fields: { name: string; label: string; type: string; required?: boolean }[] };
  deliverables_description: string[];
  example_video_url: string | null;
};

type Bundle = {
  slug: string;
  name: string;
  description: string;
  items: { recipeId: string; recipeName: string; quantity: number }[];
};

const BUNDLES: Bundle[] = [
  {
    slug: "personal-brand-starter",
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
    slug: "product-launch-pack",
    name: "Product Launch Pack",
    description: "Launch day is coming. 4 videos so your product doesn't launch into the void.",
    items: [
      { recipeId: "ba0b3663-6331-4f39-8057-48c03a8f2390", recipeName: "Product Showcase", quantity: 2 },
      { recipeId: "f7ac6c3f-fede-4c4e-b33f-da9a278b78ce", recipeName: "Testimonial / Social Proof", quantity: 1 },
      { recipeId: "7f1fd5c9-58d4-4934-a880-a1894575836a", recipeName: "Educational / Myth-Buster", quantity: 1 },
    ],
  },
  {
    slug: "content-machine",
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
  const [addingBundle, setAddingBundle] = useState<string | null>(null);
  const [userDiscountPct, setUserDiscountPct] = useState(0);
  const [lifetimeCount, setLifetimeCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [hasPendingUpgrade, setHasPendingUpgrade] = useState(false);
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
    return Math.round(cents * (1 - unlock.discountPct / 100));
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
    Promise.all([
      supabase
        .from("video_recipes")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("unlock_milestones")
        .select("*")
        .order("min_videos"),
    ]).then(([recipesRes, milestonesRes]) => {
      setRecipes(recipesRes.data || []);
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

  async function handleAddToCart(e: React.MouseEvent, recipeId: string) {
    e.stopPropagation();
    await addItem(recipeId);
  }

  // Compute unlock state from admin-approved count
  const unlock: UnlockState = getUnlockState(approvedCount, milestones);
  const upgradeCheck = canRequestTierUpgrade(lifetimeCount, approvedCount, milestones);

  // Split recipes into unlocked and locked
  const unlockedRecipes = recipes.filter((r) => unlock.unlockedRecipeSlugs.has(r.slug));
  const lockedRecipes = recipes.filter((r) => !unlock.unlockedRecipeSlugs.has(r.slug));

  // Filter bundles by unlock state
  const unlockedBundles = BUNDLES.filter((b) => unlock.bundlesUnlocked.has(b.slug));
  const lockedBundles = BUNDLES.filter((b) => !unlock.bundlesUnlocked.has(b.slug));

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
                Proof submitted — waiting for review
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
            <p className="text-lime text-xs">Maximum tier unlocked — {userDiscountPct}% off everything, forever</p>
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
              {/* Unlocked recipes — full cards */}
              {unlockedRecipes.map((recipe) => (
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

              {/* Locked recipes — teaser cards */}
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

              {/* Request Custom Video card — only if unlocked */}
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

      {/* Bundles */}
      {(unlockedBundles.length > 0 || lockedBundles.length > 0) && (
        <div>
          <h2 className="font-display font-bold text-xl text-cream mb-2">
            Bundles
          </h2>
          <p className="text-cream-31 text-sm mb-6">
            Commit to more. Save more. Procrastinate less.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Unlocked bundles */}
            {unlockedBundles.map((bundle) => (
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

            {/* Locked bundles — teaser */}
            {lockedBundles.map((bundle) => (
              <Card
                key={bundle.name}
                className="border-border flex flex-col opacity-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="default">locked</Badge>
                  <span className="text-lg">🔒</span>
                </div>

                <h3 className="font-display font-bold text-lg text-cream mb-2">
                  {bundle.name}
                </h3>

                <div className="select-none blur-[6px] pointer-events-none flex-1">
                  <p className="text-cream-61 text-sm mb-4">{bundle.description}</p>
                  <div className="h-12 bg-surface rounded-brand" />
                </div>

                <div className="mt-auto pt-4 text-center">
                  <p className="text-accent text-xs font-medium">Locked</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

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
