"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

type Recipe = {
  id: string;
  slug: string;
  name: string;
  description: string;
  complexity: string;
  price_cents: number;
  turnaround_days: number;
};

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

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
          : recipes.map((recipe) => (
              <Card key={recipe.id} hover>
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
                  <Button size="sm">Add to cart</Button>
                </div>
              </Card>
            ))}
      </div>
    </div>
  );
}
