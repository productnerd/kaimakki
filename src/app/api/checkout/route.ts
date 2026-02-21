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

  // 3. Fetch user's brand and brand_volume for discount
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, brand_volume(*)")
    .eq("user_id", user.id)
    .single();

  if (brandError || !brand) {
    return NextResponse.json(
      { error: "Failed to fetch brand" },
      { status: 500 }
    );
  }

  const brandVolume = Array.isArray(brand.brand_volume)
    ? brand.brand_volume[0]
    : brand.brand_volume;
  const discountPercent = brandVolume?.current_discount_percent ?? 0;

  // 4. Build line items with pricing
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    cartItems.map((item) => {
      const recipe = item.video_recipes;
      const listPrice = recipe.price_cents;
      const discount = Math.round(listPrice * discountPercent / 100);
      const arSurcharge = item.needs_additional_format ? 2000 : 0;
      const itemTotal = listPrice - discount + arSurcharge;

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: recipe.name,
          },
          unit_amount: itemTotal,
        },
        quantity: 1,
      };
    });

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
        cart_items: JSON.stringify(cartItems),
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
