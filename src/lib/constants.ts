export const RECIPE_ICONS: Record<string, string> = {
  "talking-head-reel": "🎙️",
  "educational-myth-buster": "🧠",
  "product-showcase": "📦",
  "testimonial-social-proof": "⭐",
  "behind-the-scenes": "🎬",
  "podcast-clipping": "🎧",
};

export function getRecipeIcon(slug: string | null | undefined): string {
  if (!slug) return "🎥";
  return RECIPE_ICONS[slug] ?? "🎥";
}

export const USER_ACTION_STATUSES = ["needs_brief", "awaiting_feedback"] as const;

export const SLA_DAYS = 30;
