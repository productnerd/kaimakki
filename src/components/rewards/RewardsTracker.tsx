"use client";

type Perk = {
  label: string;
  description: string;
  icon: string;
};

type TierData = {
  slug: string;
  name: string;
  minVideos: number;
  discountPct: number;
  perks: Perk[];
  color: string;
  glowClass: string;
};

const TIERS: TierData[] = [
  {
    slug: "starter",
    name: "Starter",
    minVideos: 1,
    discountPct: 0,
    perks: [
      { label: "Dashboard access", description: "Track orders and manage briefs", icon: "📋" },
      { label: "Standard delivery", description: "4 business day turnaround", icon: "📦" },
    ],
    color: "border-cream-31",
    glowClass: "",
  },
  {
    slug: "bronze",
    name: "Bronze",
    minVideos: 3,
    discountPct: 10,
    perks: [
      { label: "10% lifetime discount", description: "On every video, forever", icon: "💰" },
      { label: "WhatsApp group access", description: "Direct line to the team", icon: "💬" },
      { label: "Sticker pack", description: "Physical mail, laptop-worthy", icon: "🏷️" },
    ],
    color: "border-accent/50",
    glowClass: "animate-pulse-glow",
  },
  {
    slug: "silver",
    name: "Silver",
    minVideos: 8,
    discountPct: 15,
    perks: [
      { label: "15% lifetime discount", description: "Bigger savings, same quality", icon: "💰" },
      { label: "Priority queue", description: "Your videos get edited first", icon: "⚡" },
      { label: "Extra revision round", description: "One free revision per video", icon: "🔄" },
    ],
    color: "border-lime/50",
    glowClass: "animate-pulse-glow-lime",
  },
  {
    slug: "gold",
    name: "Gold",
    minVideos: 12,
    discountPct: 20,
    perks: [
      { label: "20% lifetime discount", description: "Maximum savings unlocked", icon: "💰" },
      { label: "Free strategy session", description: "30-min content strategy call", icon: "🧠" },
      { label: "Branded mug", description: "Physical proof you ship content", icon: "☕" },
      { label: "Monthly analytics roast", description: "Brutally honest performance review", icon: "📊" },
    ],
    color: "border-accent",
    glowClass: "animate-pulse-glow",
  },
];

interface RewardsTrackerProps {
  lifetimeVideoCount?: number;
  currentDiscountPercent?: number;
  lifetimeSpentCents?: number;
  lifetimeSavedCents?: number;
  mode?: "dashboard" | "pricing";
}

export default function RewardsTracker({
  lifetimeVideoCount = 0,
  currentDiscountPercent = 0,
  lifetimeSpentCents = 0,
  lifetimeSavedCents = 0,
  mode = "dashboard",
}: RewardsTrackerProps) {
  const currentTierIndex = (() => {
    let idx = 0;
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (lifetimeVideoCount >= TIERS[i].minVideos) {
        idx = i;
        break;
      }
    }
    return idx;
  })();

  const nextTier = currentTierIndex < TIERS.length - 1 ? TIERS[currentTierIndex + 1] : null;
  const videosToNext = nextTier ? nextTier.minVideos - lifetimeVideoCount : 0;

  // Progress bar: percentage between current tier and next tier
  const progressPct = (() => {
    if (!nextTier) return 100;
    const current = TIERS[currentTierIndex];
    const range = nextTier.minVideos - current.minVideos;
    const progress = lifetimeVideoCount - current.minVideos;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  })();

  return (
    <div className="space-y-8">
      {/* Stats bar — dashboard only */}
      {mode === "dashboard" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Videos ordered" value={String(lifetimeVideoCount)} />
          <StatCard label="Current discount" value={`${currentDiscountPercent}%`} accent />
          <StatCard label="Total spent" value={`€${(lifetimeSpentCents / 100).toFixed(0)}`} />
          <StatCard label="Total saved" value={`€${(lifetimeSavedCents / 100).toFixed(0)}`} lime />
        </div>
      )}

      {/* Progress to next tier */}
      {nextTier && mode === "dashboard" && (
        <div className="bg-surface border border-border rounded-brand p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-cream text-sm font-medium">
              {TIERS[currentTierIndex].name}
            </span>
            <span className="text-cream-31 text-xs">
              {videosToNext} more video{videosToNext !== 1 ? "s" : ""} to {nextTier.name}
            </span>
            <span className="text-cream text-sm font-medium">
              {nextTier.name}
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #eda4e8, #ddf073)",
              }}
            />
          </div>
        </div>
      )}

      {/* Tier roadmap */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-6 top-8 bottom-8 w-px bg-border hidden md:block" />

        <div className="space-y-6">
          {TIERS.map((tier, i) => {
            const isUnlocked = i <= currentTierIndex && mode === "dashboard";
            const isCurrent = i === currentTierIndex && mode === "dashboard";
            const isLocked = i > currentTierIndex || mode === "pricing";

            return (
              <div key={tier.slug} className="relative">
                <div
                  className={`
                    rounded-brand border p-5 transition-all duration-300
                    ${isCurrent
                      ? `bg-surface ${tier.color} ${tier.glowClass}`
                      : isUnlocked
                        ? "bg-surface/80 border-border"
                        : "bg-background/50 border-border/50"
                    }
                  `}
                >
                  {/* Tier header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Node dot */}
                      <div
                        className={`
                          relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0
                          ${isCurrent
                            ? "bg-accent/20 text-accent animate-breathe"
                            : isUnlocked
                              ? "bg-lime/20 text-lime"
                              : "bg-surface text-cream-31 border border-border"
                          }
                        `}
                      >
                        {isUnlocked && !isCurrent ? (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-sm">{tier.discountPct}%</span>
                        )}
                        {isCurrent && (
                          <div className="absolute inset-0 rounded-full border-2 border-accent/40 animate-ping" style={{ animationDuration: "2s" }} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-display font-bold text-lg ${isCurrent ? "text-cream" : isUnlocked ? "text-cream" : "text-cream-61"}`}>
                            {tier.name}
                          </h3>
                          {isCurrent && (
                            <span className="text-[10px] uppercase tracking-wider bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
                              Current
                            </span>
                          )}
                          {isUnlocked && !isCurrent && (
                            <span className="text-[10px] uppercase tracking-wider bg-lime/20 text-lime px-2 py-0.5 rounded-full font-medium">
                              Unlocked
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${isLocked ? "text-cream-31" : "text-cream-61"}`}>
                          {tier.minVideos === 1 ? "1-2 videos" : `${tier.minVideos}+ videos`}
                          {tier.discountPct > 0 && ` · ${tier.discountPct}% off everything`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Perks grid */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${isLocked ? "opacity-50" : ""}`}>
                    {tier.perks.map((perk) => (
                      <div
                        key={perk.label}
                        className={`
                          flex items-start gap-2.5 p-3 rounded-xl
                          ${isCurrent ? "bg-background/60" : isUnlocked ? "bg-background/40" : "bg-background/20"}
                        `}
                      >
                        <span className="text-base mt-0.5">{perk.icon}</span>
                        <div>
                          <p className={`text-sm font-medium ${isLocked ? "text-cream-31" : "text-cream"}`}>
                            {perk.label}
                          </p>
                          <p className={`text-xs ${isLocked ? "text-cream-20" : "text-cream-31"}`}>
                            {perk.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Lock overlay hint */}
                  {isLocked && mode === "pricing" && (
                    <div className="mt-3 text-center">
                      <span className="text-xs text-cream-31">
                        Order {tier.minVideos}+ videos to unlock
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, lime }: { label: string; value: string; accent?: boolean; lime?: boolean }) {
  return (
    <div className="p-4 bg-background rounded-brand border border-border">
      <p className="text-xs text-cream-31 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${accent ? "text-accent" : lime ? "text-lime" : "text-cream"}`}>
        {value}
      </p>
    </div>
  );
}
