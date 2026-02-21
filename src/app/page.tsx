"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
};

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const { addItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

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
          Video content,<br />
          <span className="text-accent">without the filming.</span>
        </h1>
        <p className="text-cream-61 text-lg max-w-2xl mx-auto">
          Pick a recipe, send us your footage, and get back a scroll-stopping
          video. Professional editing, captions, thumbnails — all included.
        </p>
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-brand p-6 h-64 animate-pulse"
              />
            ))
          : (
            <>
              {recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  hover
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={recipe.complexity === "simple" ? "lime" : "accent"}>
                      {recipe.complexity}
                    </Badge>
                    <span className="text-cream-31 text-xs">
                      {recipe.turnaround_days} days
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-cream mb-2">
                    {recipe.name}
                  </h3>
                  <p className="text-cream-61 text-sm mb-4 line-clamp-3">
                    {recipe.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-display font-bold text-xl text-cream">
                      &euro;{(recipe.price_cents / 100).toFixed(0)}
                    </span>
                    <Button
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
                className="border-dashed border-accent/30 flex flex-col items-center justify-center text-center min-h-[200px]"
                onClick={() => {
                  if (!user) {
                    router.push("/auth/login");
                    return;
                  }
                  router.push("/custom-request");
                }}
              >
                <div className="text-accent text-3xl mb-3">+</div>
                <h3 className="font-display font-bold text-lg text-cream mb-2">
                  Request Custom Video
                </h3>
                <p className="text-cream-31 text-sm">
                  Have something specific in mind? Send us a brief and we&apos;ll quote you.
                </p>
              </Card>
            </>
          )}
      </div>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </div>
  );
}
