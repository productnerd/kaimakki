export type VerticalMeta = {
  slug: string;
  name: string;
  icon: string;
  headline: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  starterDescription: string;
  advancedDescription: string;
};

export const VERTICALS: Record<string, VerticalMeta> = {
  "real-estate": {
    slug: "real-estate",
    name: "Real Estate",
    icon: "🏠",
    headline: "Video Templates for Real Estate Agents",
    subtitle: "Property tours, listing videos, and agent branding — all done for you.",
    metaTitle: "Video Templates for Real Estate | Kaimakki Studio",
    metaDescription: "Professional short-form video templates designed for real estate agents. Property tours, listing videos, and agent branding content.",
    starterDescription: "Four videos to stop potential buyers mid-scroll. Property tours, agent intros, and neighborhood vibes — the essentials that make listings actually move.",
    advancedDescription: "The full content arsenal. Listings, walkthroughs, market takes, client wins — enough to make you the agent everyone sees on their feed.",
  },
  "personal-brands": {
    slug: "personal-brands",
    name: "Personal Brands",
    icon: "🎤",
    headline: "Video Templates for Personal Brands",
    subtitle: "Build your brand with scroll-stopping content. No film crew needed.",
    metaTitle: "Video Templates for Personal Brands | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for personal brands. Tips, stories, and opinion content that builds your audience.",
    starterDescription: "Four videos to prove you exist on the internet. Talking heads, hot takes, and enough content to keep your audience from forgetting you.",
    advancedDescription: "Eight videos to go from 'who?' to 'oh, THEM.' A mix of opinion pieces, stories, and proof that you actually know your stuff.",
  },
  "product-businesses": {
    slug: "product-businesses",
    name: "Product Businesses",
    icon: "📦",
    headline: "Video Templates for Product Businesses",
    subtitle: "Showcase your products with videos that actually convert.",
    metaTitle: "Video Templates for Product Businesses | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for product businesses. Launches, demos, unboxings, and social proof content.",
    starterDescription: "Four videos to show your product in the wild. Demos, unboxings, and social proof — the basics that turn scrollers into buyers.",
    advancedDescription: "Eight videos that cover every angle. Launches, how-tos, testimonials, and behind-the-scenes — a full content engine for your product.",
  },
  "service-businesses": {
    slug: "service-businesses",
    name: "Service Businesses",
    icon: "🛠️",
    headline: "Video Templates for Service Businesses",
    subtitle: "Show the world what you do — and why they should hire you.",
    metaTitle: "Video Templates for Service Businesses | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for service businesses. Case studies, behind-the-scenes, and client testimonials.",
    starterDescription: "Four videos to show what you actually do. Case studies, behind-the-scenes, and proof you're not just a logo on a website.",
    advancedDescription: "Eight videos to become the obvious choice. Client stories, process breakdowns, expertise clips — enough to fill your pipeline.",
  },
  "hospitality": {
    slug: "hospitality",
    name: "Hospitality",
    icon: "🍽️",
    headline: "Video Templates for Restaurants, Cafés & Hotels",
    subtitle: "Mouth-watering content that fills seats and books rooms.",
    metaTitle: "Video Templates for Hospitality | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for restaurants, cafés, and hotels. Showcase your space, menu, and atmosphere.",
    starterDescription: "Four videos to make people hungry, thirsty, or desperate to book. Menu highlights, vibes, and the kind of content that fills tables.",
    advancedDescription: "Eight videos that turn your space into a destination. Seasonal menus, chef stories, event recaps, and atmosphere content that books out your weekends.",
  },
  "fitness-wellness": {
    slug: "fitness-wellness",
    name: "Fitness & Wellness",
    icon: "💪",
    headline: "Video Templates for Fitness & Wellness",
    subtitle: "Transformations, tips, and motivation — edited to keep people watching.",
    metaTitle: "Video Templates for Fitness & Wellness | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for gyms, coaches, and wellness studios. Transformation stories, workout tips, and brand content.",
    starterDescription: "Four videos to get clients off the couch. Transformations, quick tips, and workout content that makes people want what you're selling.",
    advancedDescription: "Eight videos to own your niche. Training clips, client wins, myth-busters, and educational content that builds real authority.",
  },
  "events": {
    slug: "events",
    name: "Events",
    icon: "🎉",
    headline: "Video Templates for Event Professionals",
    subtitle: "Turn every gig into a highlight reel that books the next one.",
    metaTitle: "Video Templates for Events | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for DJs, photographers, planners, and event pros. Recaps, teasers, and promo content.",
    starterDescription: "Four videos to book the next gig before the current one's over. Recaps, teasers, and the kind of content that makes people DM you.",
    advancedDescription: "Eight videos to stay booked all year. Event highlights, behind-the-scenes, client reactions, and promo content for every season.",
  },
  "medicine": {
    slug: "medicine",
    name: "Medicine",
    icon: "🩺",
    headline: "Video Templates for Medical Professionals",
    subtitle: "Build trust before the first appointment. Show patients you know your stuff.",
    metaTitle: "Video Templates for Medical Professionals | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for doctors, clinics, and health practitioners. Educational content, patient testimonials, and practice branding.",
    starterDescription: "Four videos to build patient trust before they even walk in. Explainers, myth-busters, and the kind of content that makes people choose you over Dr. Google.",
    advancedDescription: "Eight videos to become the go-to voice in your field. Patient education, procedure walkthroughs, team intros, and trust-building content.",
  },
  "artists-craftsmen": {
    slug: "artists-craftsmen",
    name: "Artists & Craftsmen",
    icon: "🎨",
    headline: "Video Templates for Artists & Craftsmen",
    subtitle: "Show the process. Sell the craft. Let people watch you make things.",
    metaTitle: "Video Templates for Artists & Craftsmen | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for makers, artists, and artisans. Process videos, portfolio showcases, and behind-the-scenes content.",
    starterDescription: "Four videos to show the magic behind the making. Process clips, finished pieces, and content that turns watchers into buyers.",
    advancedDescription: "Eight videos to build a following around your craft. Studio tours, commissions, time-lapses, and stories that make people appreciate the work.",
  },
  "sport": {
    slug: "sport",
    name: "Sport",
    icon: "⚽",
    headline: "Video Templates for Sports & Athletes",
    subtitle: "Highlights, recaps, and content that gets fans off the bench.",
    metaTitle: "Video Templates for Sports & Athletes | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for athletes, teams, and sports brands. Highlights, training content, and event recaps.",
    starterDescription: "Four videos to get fans fired up. Highlights, recaps, and training content that keeps your audience locked in.",
    advancedDescription: "Eight videos to build a real sports brand. Game day content, athlete profiles, fan engagement, and behind-the-scenes from practice to podium.",
  },
  "fashion": {
    slug: "fashion",
    name: "Fashion",
    icon: "👗",
    headline: "Video Templates for Fashion Brands",
    subtitle: "Lookbooks, drops, and content that makes people hit add to cart.",
    metaTitle: "Video Templates for Fashion | Kaimakki Studio",
    metaDescription: "Professional short-form video templates for fashion brands, designers, and stylists. Launches, lookbooks, and styling content.",
    starterDescription: "Four videos to make your brand pop on the feed. Lookbooks, styling tips, and drop teasers that drive add-to-carts.",
    advancedDescription: "Eight videos to become a fashion content machine. Seasonal collections, behind-the-scenes, styling tutorials, and launch content that creates demand.",
  },
};

export const VERTICAL_SLUGS = Object.keys(VERTICALS);
