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
};

export const VERTICAL_SLUGS = Object.keys(VERTICALS);
