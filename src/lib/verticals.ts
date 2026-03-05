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
  "medicine": {
    slug: "medicine",
    name: "Medicine",
    headline: "Video Templates for Medical Professionals",
    subtitle: "Build trust before the first appointment. Show patients you know your stuff.",
    metaTitle: "Video Templates for Medical Professionals | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for doctors, clinics, and health practitioners. Educational content, patient testimonials, and practice branding.",
  },
  "artists-craftsmen": {
    slug: "artists-craftsmen",
    name: "Artists & Craftsmen",
    headline: "Video Templates for Artists & Craftsmen",
    subtitle: "Show the process. Sell the craft. Let people watch you make things.",
    metaTitle: "Video Templates for Artists & Craftsmen | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for makers, artists, and artisans. Process videos, portfolio showcases, and behind-the-scenes content.",
  },
  "sport": {
    slug: "sport",
    name: "Sport",
    headline: "Video Templates for Sports & Athletes",
    subtitle: "Highlights, recaps, and content that gets fans off the bench.",
    metaTitle: "Video Templates for Sports & Athletes | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for athletes, teams, and sports brands. Highlights, training content, and event recaps.",
  },
  "fashion": {
    slug: "fashion",
    name: "Fashion",
    headline: "Video Templates for Fashion Brands",
    subtitle: "Lookbooks, drops, and content that makes people hit add to cart.",
    metaTitle: "Video Templates for Fashion | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for fashion brands, designers, and stylists. Launches, lookbooks, and styling content.",
  },
};

export const VERTICAL_SLUGS = Object.keys(VERTICALS);
