import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();

  let event: Stripe.Event;

  const skipVerification =
    process.env.STRIPE_SECRET_KEY === "PLACEHOLDER" ||
    !process.env.STRIPE_WEBHOOK_SECRET;

  if (skipVerification) {
    console.warn(
      "Stripe webhook signature verification SKIPPED (local dev mode)"
    );
    event = JSON.parse(body) as Stripe.Event;
  } else {
    const signature = req.headers.get("stripe-signature")!;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata!;

    const userId = metadata.user_id;
    const brandId = metadata.brand_id;
    const cartItems = JSON.parse(metadata.cart_items) as Array<{
      recipe_id: string;
      intake_responses: Record<string, unknown>;
      notes: string | null;
      footage_folder_url: string | null;
      primary_platform: string;
      primary_aspect_ratio: string;
      needs_additional_format: boolean;
      additional_aspect_ratio: string | null;
      ar_surcharge_cents: number;
      list_price_cents: number;
      discount_percent: number;
      discount_cents: number;
      surcharge_cents: number;
      total_charged_cents: number;
    }>;

    // Fetch discount tiers for recalculating brand volume
    const { data: discountTiers } = await supabaseAdmin
      .from("discount_tiers")
      .select("*")
      .order("min_video_count", { ascending: true });

    // Insert orders for each cart item
    for (const item of cartItems) {
      const { data: orderNumData } = await supabaseAdmin.rpc(
        "generate_order_number"
      );

      await supabaseAdmin.from("orders").insert({
        order_number: orderNumData,
        user_id: userId,
        brand_id: brandId,
        recipe_id: item.recipe_id,
        status: "needs_brief",
        intake_responses: item.intake_responses,
        notes: item.notes,
        footage_folder_url: item.footage_folder_url,
        primary_platform: item.primary_platform,
        primary_aspect_ratio: item.primary_aspect_ratio,
        needs_additional_format: item.needs_additional_format,
        additional_aspect_ratio: item.additional_aspect_ratio,
        ar_surcharge_cents: item.ar_surcharge_cents,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        list_price_cents: item.list_price_cents,
        discount_percent: item.discount_percent,
        discount_cents: item.discount_cents,
        surcharge_cents: item.surcharge_cents,
        total_charged_cents: item.total_charged_cents,
      });
    }

    // Delete all cart items for this user
    await supabaseAdmin.from("cart_items").delete().eq("user_id", userId);

    // Update brand volume
    const totalVideos = cartItems.length;
    const totalSpent = cartItems.reduce(
      (sum, item) => sum + item.total_charged_cents,
      0
    );
    const totalSaved = cartItems.reduce(
      (sum, item) => sum + item.discount_cents,
      0
    );

    const { data: brandVolume } = await supabaseAdmin
      .from("brand_volume")
      .select("lifetime_video_count, lifetime_spent_cents, lifetime_saved_cents")
      .eq("brand_id", brandId)
      .single();

    if (brandVolume) {
      const newVideoCount =
        brandVolume.lifetime_video_count + totalVideos;
      const newSpent =
        brandVolume.lifetime_spent_cents + totalSpent;
      const newSaved =
        brandVolume.lifetime_saved_cents + totalSaved;

      // Recalculate discount percent based on new video count
      let newDiscountPercent = 0;
      if (discountTiers) {
        for (const tier of discountTiers) {
          if (newVideoCount >= tier.min_video_count) {
            newDiscountPercent = tier.discount_percent;
          }
        }
      }

      await supabaseAdmin
        .from("brand_volume")
        .update({
          lifetime_video_count: newVideoCount,
          lifetime_spent_cents: newSpent,
          lifetime_saved_cents: newSaved,
          current_discount_percent: newDiscountPercent,
        })
        .eq("brand_id", brandId);
    }
  }

  return NextResponse.json({ received: true });
}
