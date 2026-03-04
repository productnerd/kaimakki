"use client";

import RewardsTracker from "@/components/rewards/RewardsTracker";

export default function LoyaltyProgramPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display font-black text-3xl md:text-5xl text-cream mb-3">
          The Loyalty Ladder
        </h1>
        <p className="text-cream-61 text-lg max-w-xl mx-auto">
          The more you order, the cheaper it gets. Sit on your videos too long?
          That money goes to charity. We&apos;re your accountability partners — with teeth.
        </p>
      </div>

      {/* Rewards Roadmap */}
      <div className="mb-16">
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
          <li>5. Perks are cumulative — unlock a tier and you keep those perks at every tier above too.</li>
        </ul>
      </div>
    </div>
  );
}
