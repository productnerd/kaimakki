"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type Recipe = {
  name: string;
  price_cents: number;
  turnaround_days: number;
  complexity: string;
};

type Tier = {
  name: string;
  min_video_count: number;
  discount_percent: number;
};

export default function PricingPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("video_recipes").select("name, price_cents, turnaround_days, complexity").eq("is_active", true).order("sort_order"),
      supabase.from("discount_tiers").select("*").order("sort_order"),
    ]).then(([recipesRes, tiersRes]) => {
      setRecipes(recipesRes.data || []);
      setTiers(tiersRes.data || []);
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display font-black text-3xl md:text-5xl text-cream mb-3">
          Simple, transparent pricing
        </h1>
        <p className="text-cream-61 text-lg max-w-xl mx-auto">
          Pick a recipe. The more you order, the more you save.
        </p>
      </div>

      {/* Recipe prices */}
      <div className="mb-16">
        <h2 className="font-display font-bold text-xl text-cream mb-6">
          Video Recipes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 text-sm font-medium text-cream-61">Recipe</th>
                <th className="py-3 text-sm font-medium text-cream-61">Price</th>
                <th className="py-3 text-sm font-medium text-cream-61">Turnaround</th>
                <th className="py-3 text-sm font-medium text-cream-61">Complexity</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((r) => (
                <tr key={r.name} className="border-b border-border/50">
                  <td className="py-4 text-cream font-medium">{r.name}</td>
                  <td className="py-4 font-display font-bold text-cream">
                    &euro;{(r.price_cents / 100).toFixed(0)}
                  </td>
                  <td className="py-4 text-cream-61">{r.turnaround_days} business days</td>
                  <td className="py-4">
                    <Badge variant={r.complexity === "simple" ? "lime" : "accent"}>
                      {r.complexity}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-cream-31 text-sm mt-4">
          Add-on: Additional aspect ratio — +&euro;20 per video
        </p>
      </div>

      {/* Volume discount tiers */}
      <div>
        <h2 className="font-display font-bold text-xl text-cream mb-3">
          Volume Discounts
        </h2>
        <p className="text-cream-61 text-sm mb-6">
          The more videos your brand orders over time, the cheaper each one gets.
          Once a tier is unlocked, the discount applies to all future orders.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tiers.map((tier) => (
            <Card key={tier.name}>
              <div className="text-center">
                <p className="font-display font-bold text-2xl text-accent mb-1">
                  {tier.discount_percent}%
                </p>
                <p className="font-display font-bold text-cream text-sm mb-2">
                  {tier.name}
                </p>
                <p className="text-cream-31 text-xs">
                  {tier.min_video_count === 1
                    ? "1-2 videos"
                    : `${tier.min_video_count}+ videos`}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8 bg-surface rounded-brand p-6 border border-border">
          <h3 className="font-display font-bold text-cream mb-3">How it works</h3>
          <ul className="space-y-2 text-sm text-cream-61">
            <li>1. Your discount is based on your brand&apos;s total completed video orders — lifetime.</li>
            <li>2. Once a tier is unlocked, the discount applies forever.</li>
            <li>3. At checkout, we calculate your discount based on your current video count + the new order.</li>
            <li>4. No bulk purchase required — order one at a time and the discounts stack up.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
