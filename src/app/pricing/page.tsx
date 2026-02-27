"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Badge from "@/components/ui/Badge";
import RewardsTracker from "@/components/rewards/RewardsTracker";

type Recipe = {
  name: string;
  price_cents: number;
  turnaround_days: number;
  complexity: string;
};

export default function PricingPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("video_recipes")
      .select("name, price_cents, turnaround_days, complexity")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setRecipes(data || []));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display font-black text-3xl md:text-5xl text-cream mb-3">
          Pricing that punishes procrastination
        </h1>
        <p className="text-cream-61 text-lg max-w-xl mx-auto">
          The more you order, the cheaper it gets. Sit on your videos too long?
          That money goes to charity. We&apos;re your accountability partners — with teeth.
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
        <div className="mt-4 space-y-1">
          <p className="text-cream-31 text-sm">Add-ons per video:</p>
          <ul className="text-cream-31 text-sm space-y-0.5">
            <li>Additional aspect ratio — +&euro;20</li>
            <li>Stock footage — +&euro;15</li>
            <li>AI voiceover — +&euro;25</li>
            <li>Expedited delivery (2 days) — +&euro;40</li>
          </ul>
        </div>
      </div>

      {/* Rewards Roadmap */}
      <div className="mb-16">
        <h2 className="font-display font-bold text-xl text-cream mb-3">
          The Loyalty Ladder
        </h2>
        <p className="text-cream-61 text-sm mb-3">
          We help you ship more videos by managing the complexity and overwhelm for you.
          From first-time creator to mass production — we take you by the hand, one tier at a time.
        </p>
        <p className="text-cream-31 text-xs mb-8">
          Prices start higher because there&apos;s an initial setup cost — we need time to understand your style,
          preferences, brand, and strategy. Once we know you, everything gets faster, smoother, and cheaper.
        </p>

        <RewardsTracker mode="pricing" />
      </div>

      {/* Fine print */}
      <div className="bg-surface rounded-brand p-6 border border-border">
        <h3 className="font-display font-bold text-cream mb-3">The fine print (it&apos;s actually good)</h3>
        <ul className="space-y-2 text-sm text-cream-61">
          <li>1. Your discount is based on your brand&apos;s total video orders. Lifetime. It only goes up.</li>
          <li>2. Once unlocked, a tier is yours forever. We don&apos;t do takebacks.</li>
          <li>3. At checkout, we apply your highest discount to your most expensive video first. Maximum savings.</li>
          <li>4. You pay upfront. If you don&apos;t ship footage or post within 30 days, we donate a portion to charity. Consider it motivation.</li>
          <li>5. Perks are cumulative — unlock Bronze and you keep those perks at Silver and Gold too.</li>
        </ul>
      </div>
    </div>
  );
}
