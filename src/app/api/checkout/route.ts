import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST() {
  // Handle placeholder key for testing
  if (
    !process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY === "PLACEHOLDER" ||
    process.env.STRIPE_SECRET_KEY === "sk_test_PLACEHOLDER"
  ) {
    return NextResponse.json({
      url: "https://example.com/mock-checkout-session",
    });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-01-28.clover",
  });

  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch cart items joined with video_recipes
  const { data: cartItems, error: cartError } = await supabase
    .from("cart_items")
    .select("*, video_recipes(*)")
    .eq("user_id", user.id);

  if (cartError) {
    return NextResponse.json(
      { error: "Failed to fetch cart items" },
      { status: 500 }
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // 3. Fetch user's brand, brand_volume, and discount tiers
  const [brandResult, tiersResult] = await Promise.all([
    supabase
      .from("brands")
      .select("id, brand_volume(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("discount_tiers")
      .select("min_video_count, discount_percent")
      .order("min_video_count", { ascending: true }),
  ]);

  if (!brandResult.data) {
    return NextResponse.json(
      { error: "Failed to fetch brand" },
      { status: 500 }
    );
  }

  const brand = brandResult.data;
  const tiers = tiersResult.data ?? [];
  const brandVolume = Array.isArray(brand.brand_volume)
    ? brand.brand_volume[0]
    : brand.brand_volume;
  const lifetimeCount = brandVolume?.lifetime_video_count ?? 0;

  // Helper: get discount % for a given video count
  function getDiscountForCount(count: number): number {
    let pct = 0;
    for (const tier of tiers) {
      if (count >= tier.min_video_count) pct = tier.discount_percent;
    }
    return pct;
  }

  // 4. Build line items and enriched cart — discount changes mid-cart as tiers are crossed
  const enrichedItems = cartItems.map((item, index) => {
    const recipe = item.video_recipes;
    const listPrice = recipe.price_cents;
    const videoNumber = lifetimeCount + index + 1;
    const discountPercent = getDiscountForCount(videoNumber);
    const discountCents = Math.round(listPrice * discountPercent / 100);
    const surcharge = item.needs_additional_format ? 2000 : 0;
    const totalCharged = listPrice - discountCents + surcharge;

    return {
      recipe_id: item.recipe_id,
      intake_responses: item.intake_responses,
      notes: item.notes,
      footage_folder_url: item.footage_folder_url,
      primary_platform: item.primary_platform,
      primary_aspect_ratio: item.primary_aspect_ratio,
      needs_additional_format: item.needs_additional_format,
      additional_aspect_ratio: item.additional_aspect_ratio,
      ar_surcharge_cents: surcharge,
      list_price_cents: listPrice,
      discount_percent: discountPercent,
      discount_cents: discountCents,
      surcharge_cents: surcharge,
      total_charged_cents: totalCharged,
      _recipe_name: recipe.name,
    };
  });

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    enrichedItems.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: { name: item._recipe_name },
        unit_amount: item.total_charged_cents,
      },
      quantity: 1,
    }));

  // 5. Create Stripe Checkout session
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}`,
      metadata: {
        user_id: user.id,
        brand_id: brand.id,
        cart_items: JSON.stringify(enrichedItems),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session creation failed:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
