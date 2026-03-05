export type VerticalMeta = {
  slug: string;
  name: string;
  headline: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
};

export const VERTICALS: Record<string, VerticalMeta> = {
  "real-estate": {
    slug: "real-estate",
    name: "Real Estate",
    headline: "Video Templates for Real Estate Agents",
    subtitle: "Property tours, listing videos, and agent branding — all done for you.",
    metaTitle: "Video Templates for Real Estate | Kaimakki Studio",
    metaDescription: "Professional short-form video templates designed for real estate agents. Property tours, listing videos, and agent branding content.",
  },
  "personal-brands": {
    slug: "personal-brands",
    name: "Personal Brands",
    headline: "Video Templates for Personal Brands",
    subtitle: "Build your brand with scroll-stopping content. No film crew needed.",
    metaTitle: "Video Templates for Personal Brands | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for personal brands. Tips, stories, and opinion content that builds your audience.",
  },
  "product-businesses": {
    slug: "product-businesses",
    name: "Product Businesses",
    headline: "Video Templates for Product Businesses",
    subtitle: "Showcase your products with videos that actually convert.",
    metaTitle: "Video Templates for Product Businesses | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for product businesses. Launches, demos, unboxings, and social proof content.",
  },
  "service-businesses": {
    slug: "service-businesses",
    name: "Service Businesses",
    headline: "Video Templates for Service Businesses",
    subtitle: "Show the world what you do — and why they should hire you.",
    metaTitle: "Video Templates for Service Businesses | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for service businesses. Case studies, behind-the-scenes, and client testimonials.",
  },
  "hospitality": {
    slug: "hospitality",
    name: "Hospitality",
    headline: "Video Templates for Restaurants, Cafés & Hotels",
    subtitle: "Mouth-watering content that fills seats and books rooms.",
    metaTitle: "Video Templates for Hospitality | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for restaurants, cafés, and hotels. Showcase your space, menu, and atmosphere.",
  },
  "fitness-wellness": {
    slug: "fitness-wellness",
    name: "Fitness & Wellness",
    headline: "Video Templates for Fitness & Wellness",
    subtitle: "Transformations, tips, and motivation — edited to keep people watching.",
    metaTitle: "Video Templates for Fitness & Wellness | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for gyms, coaches, and wellness studios. Transformation stories, workout tips, and brand content.",
  },
  "events": {
    slug: "events",
    name: "Events",
    headline: "Video Templates for Event Professionals",
    subtitle: "Turn every gig into a highlight reel that books the next one.",
    metaTitle: "Video Templates for Events | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for DJs, photographers, planners, and event pros. Recaps, teasers, and promo content.",
  },
};

export const VERTICAL_SLUGS = Object.keys(VERTICALS);
