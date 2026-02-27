export type Milestone = {
  id: string;
  min_videos: number;
  tier_name: string;
  discount_percent: number;
  unlocked_recipe_slugs: string[];
  unlocked_addons: string[];
  max_duration_seconds: number;
  landscape_unlocked: boolean;
  dual_format_free: boolean;
  bundles_unlocked: string[];
  custom_requests_unlocked: boolean;
  support_level: string;
  perks: { label: string; icon: string; category?: string }[];
};

export type UnlockState = {
  tier: string;
  discountPct: number;
  unlockedRecipeSlugs: Set<string>;
  unlockedAddons: Set<string>;
  maxDurationSeconds: number;
  landscapeUnlocked: boolean;
  dualFormatFree: boolean;
  bundlesUnlocked: Set<string>;
  customRequestsUnlocked: boolean;
  supportLevel: string;
  currentMilestone: Milestone | null;
  nextMilestone: Milestone | null;
  progressPct: number;
  allPerks: { label: string; icon: string; category?: string; inherited: boolean }[];
};

/**
 * Compute the full unlock state for a user given their lifetime video count.
 * Milestones are cumulative — values from all reached milestones are merged.
 */
export function getUnlockState(
  lifetimeCount: number,
  milestones: Milestone[],
): UnlockState {
  // Sort milestones by min_videos ascending
  const sorted = [...milestones].sort((a, b) => a.min_videos - b.min_videos);

  const recipeSlugs = new Set<string>();
  const addons = new Set<string>();
  const bundles = new Set<string>();
  const allPerks: { label: string; icon: string; category?: string; inherited: boolean }[] = [];

  let tier = "New";
  let discountPct = 0;
  let maxDuration = 30;
  let landscape = false;
  let dualFree = false;
  let customRequests = false;
  let support = "chat";
  let currentMilestone: Milestone | null = null;
  let nextMilestone: Milestone | null = null;

  for (const ms of sorted) {
    if (lifetimeCount >= ms.min_videos) {
      // User has reached this milestone — merge everything
      tier = ms.tier_name;
      discountPct = Math.max(discountPct, ms.discount_percent);
      maxDuration = Math.max(maxDuration, ms.max_duration_seconds);
      if (ms.landscape_unlocked) landscape = true;
      if (ms.dual_format_free) dualFree = true;
      if (ms.custom_requests_unlocked) customRequests = true;
      support = ms.support_level;
      currentMilestone = ms;

      for (const slug of ms.unlocked_recipe_slugs) recipeSlugs.add(slug);
      for (const addon of ms.unlocked_addons) addons.add(addon);
      for (const bundle of ms.bundles_unlocked) bundles.add(bundle);
    } else {
      // First milestone the user hasn't reached = next target
      if (!nextMilestone) nextMilestone = ms;
      // Collect future perks as non-inherited (for display)
    }
  }

  // Build perks list: current milestone's own perks + inherited from previous
  // Show all perks from reached milestones, marking earlier ones as inherited
  for (const ms of sorted) {
    if (lifetimeCount < ms.min_videos) break;
    const isCurrentTier = ms === currentMilestone;
    for (const perk of ms.perks) {
      if (perk.label.includes("discount")) continue; // discounts shown separately
      allPerks.push({
        label: perk.label,
        icon: perk.icon,
        category: perk.category,
        inherited: !isCurrentTier,
      });
    }
  }

  const progressPct = nextMilestone
    ? Math.min(100, Math.max(0, (lifetimeCount / nextMilestone.min_videos) * 100))
    : 100;

  return {
    tier,
    discountPct,
    unlockedRecipeSlugs: recipeSlugs,
    unlockedAddons: addons,
    maxDurationSeconds: maxDuration,
    landscapeUnlocked: landscape,
    dualFormatFree: dualFree,
    bundlesUnlocked: bundles,
    customRequestsUnlocked: customRequests,
    supportLevel: support,
    currentMilestone,
    nextMilestone,
    progressPct,
    allPerks,
  };
}

/** Check if a specific recipe is unlocked */
export function isRecipeUnlocked(slug: string, state: UnlockState): boolean {
  return state.unlockedRecipeSlugs.has(slug);
}

/** Check if a specific add-on is unlocked */
export function isAddonUnlocked(addonKey: string, state: UnlockState): boolean {
  return state.unlockedAddons.has(addonKey);
}

/** Get the milestone that unlocks a specific recipe */
export function getRecipeUnlockMilestone(
  slug: string,
  milestones: Milestone[],
): Milestone | null {
  const sorted = [...milestones].sort((a, b) => a.min_videos - b.min_videos);
  for (const ms of sorted) {
    if (ms.unlocked_recipe_slugs.includes(slug)) return ms;
  }
  return null;
}

/**
 * Check if user is eligible to request a tier upgrade.
 * Eligible when: completedCount >= nextMilestone.min_videos AND approvedCount < nextMilestone.min_videos
 */
export function canRequestTierUpgrade(
  completedCount: number,
  approvedCount: number,
  milestones: Milestone[],
): { eligible: boolean; nextMilestone: Milestone | null } {
  const approvedState = getUnlockState(approvedCount, milestones);
  const nextMilestone = approvedState.nextMilestone;
  if (!nextMilestone) return { eligible: false, nextMilestone: null };
  return {
    eligible: completedCount >= nextMilestone.min_videos,
    nextMilestone,
  };
}

/** Get the milestone that unlocks a specific add-on */
export function getAddonUnlockMilestone(
  addonKey: string,
  milestones: Milestone[],
): Milestone | null {
  const sorted = [...milestones].sort((a, b) => a.min_videos - b.min_videos);
  for (const ms of sorted) {
    if (ms.unlocked_addons.includes(addonKey)) return ms;
  }
  return null;
}
