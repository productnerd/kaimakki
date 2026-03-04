"use client";

import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";
import { getRecipeIcon } from "@/lib/constants";
import Button from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SESSION_SLUGS = new Set(["strategy-session", "branding-session"]);
const MIN_FIRST_ORDER_VIDEOS = 3;

type GroupedItem = {
  key: string;
  recipe_name: string;
  recipe_slug: string;
  recipe_type: string;
  price_cents: number;
  discounted_price_cents: number;
  discount_pct: number;
  needs_additional_format: boolean;
  needs_stock_footage: boolean;
  needs_ai_voice: boolean;
  recipe_mode: string;
  ids: string[];
  quantity: number;
};

function getExtrasTotal(g: {
  needs_additional_format: boolean;
  needs_stock_footage: boolean;
  needs_ai_voice: boolean;
}): number {
  let extras = 0;
  if (g.needs_additional_format) extras += 2000;
  if (g.needs_stock_footage) extras += 1500;
  if (g.needs_ai_voice) extras += 2500;
  return extras;
}

export default function CartDrawer() {
  const { items, pricedItems, isOpen, closeCart, removeItem, itemCount, videoItemCount, isFirstTimeBuyer, toast, clearToast } = useCart();
  const { user } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Group priced items by recipe_id + extras + discount_pct
  const grouped: GroupedItem[] = [];
  for (const item of pricedItems) {
    const isSession = SESSION_SLUGS.has(item.recipe_slug ?? "");
    if (isSession) {
      // Sessions are never grouped — show each individually
      grouped.push({
        key: `session-${item.id}`,
        recipe_name: item.recipe_name ?? "",
        recipe_slug: item.recipe_slug ?? "",
        recipe_type: item.recipe_type ?? "video",
        price_cents: 0,
        discounted_price_cents: 0,
        discount_pct: 0,
        needs_additional_format: false,
        needs_stock_footage: false,
        needs_ai_voice: false,
        recipe_mode: "donkey",
        ids: [item.id],
        quantity: 1,
      });
      continue;
    }
    const key = `${item.recipe_id}|${item.needs_additional_format}|${item.needs_stock_footage}|${item.needs_ai_voice}|${item.discount_pct}|${item.recipe_mode}`;
    const existing = grouped.find((g) => g.key === key);
    if (existing) {
      existing.ids.push(item.id);
      existing.quantity += 1;
    } else {
      grouped.push({
        key,
        recipe_name: item.recipe_name ?? "",
        recipe_slug: item.recipe_slug ?? "",
        recipe_type: item.recipe_type ?? "video",
        price_cents: item.price_cents ?? 0,
        discounted_price_cents: item.discounted_price_cents,
        discount_pct: item.discount_pct,
        needs_additional_format: item.needs_additional_format,
        needs_stock_footage: item.needs_stock_footage,
        needs_ai_voice: item.needs_ai_voice,
        recipe_mode: item.recipe_mode ?? "donkey",
        ids: [item.id],
        quantity: 1,
      });
    }
  }

  // Sort: video items first, sessions last
  const videoGroups = grouped.filter((g) => g.recipe_type !== "session");
  const sessionGroups = grouped.filter((g) => g.recipe_type === "session");
  const sortedGroups = [...videoGroups, ...sessionGroups];

  const subtotal = pricedItems
    .filter((i) => !SESSION_SLUGS.has(i.recipe_slug ?? ""))
    .reduce((sum, item) => sum + item.discounted_price_cents + getExtrasTotal(item), 0);

  const subtotalBeforeDiscount = pricedItems
    .filter((i) => !SESSION_SLUGS.has(i.recipe_slug ?? ""))
    .reduce((sum, item) => sum + (item.price_cents ?? 0) + getExtrasTotal(item), 0);

  const totalSaved = subtotalBeforeDiscount - subtotal;

  const videosNeeded = isFirstTimeBuyer ? Math.max(0, MIN_FIRST_ORDER_VIDEOS - videoItemCount) : 0;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail);
  const canCheckout = videoItemCount > 0 && videosNeeded === 0 && (user || isValidEmail);

  async function handleRemoveGroup(ids: string[]) {
    for (const id of ids) {
      await removeItem(id);
    }
  }

  async function handleCheckout() {
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const supabase = createClient();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      let body: string | undefined;

      if (user) {
        // Authenticated checkout
        const { data: { session } } = await supabase.auth.getSession();
        headers.Authorization = `Bearer ${session?.access_token}`;
      } else {
        // Guest checkout — send email + cart items
        body = JSON.stringify({
          guest_email: guestEmail,
          guest_cart: items.map((i) => ({
            recipe_id: i.recipe_id,
            recipe_mode: i.recipe_mode,
            needs_additional_format: i.needs_additional_format,
            needs_stock_footage: i.needs_stock_footage,
            needs_ai_voice: i.needs_ai_voice,
          })),
        });
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/checkout`,
        { method: "POST", headers, body }
      );
      const data = await res.json();
      if (data.error) {
        setCheckoutError(data.error);
        setCheckoutLoading(false);
        return;
      }
      if (data.url) {
        closeCart();
        window.location.href = data.url;
      }
    } catch {
      setCheckoutError("Something went wrong. Try again.");
      setCheckoutLoading(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={closeCart}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-md
          bg-surface border-l border-border z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-display font-bold text-lg text-cream">
            Cart ({itemCount})
          </h2>
          <button
            onClick={closeCart}
            className="text-cream-31 hover:text-cream transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mx-6 mt-4 bg-lime/10 border border-lime/30 rounded-brand px-4 py-3 flex items-start gap-2">
            <span className="text-lime text-sm flex-1">{toast}</span>
            <button onClick={clearToast} className="text-lime/60 hover:text-lime text-xs mt-0.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* First-time buyer banner */}
        {isFirstTimeBuyer && videoItemCount > 0 && (
          <div className="mx-6 mt-4 bg-accent/10 border border-accent/30 rounded-brand px-4 py-3">
            <p className="text-accent text-sm font-medium">
              Your first order includes a free Strategy + Branding session!
            </p>
            {videosNeeded > 0 && (
              <p className="text-cream-31 text-xs mt-1">
                Add {videosNeeded} more video{videosNeeded > 1 ? "s" : ""} to unlock your first order.
              </p>
            )}
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedGroups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-cream-31 text-sm">Your cart is empty</p>
              <p className="text-cream-20 text-xs mt-1">
                Browse recipes and add videos to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Video items */}
              {videoGroups.map((g) => {
                const unitTotal = g.discounted_price_cents + getExtrasTotal(g);
                const unitFull = g.price_cents + getExtrasTotal(g);
                const lineTotal = unitTotal * g.quantity;
                const lineFull = unitFull * g.quantity;
                const hasDiscount = g.discount_pct > 0;

                return (
                  <div
                    key={g.key}
                    className="bg-background rounded-brand p-4 border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-cream text-sm">
                          {g.quantity > 1 && (
                            <span className="text-accent mr-1.5">{g.quantity}x</span>
                          )}
                          <span className="mr-1">{getRecipeIcon(g.recipe_slug)}</span>{g.recipe_name}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            g.recipe_mode === "creative"
                              ? "text-accent bg-accent/10"
                              : "text-cream-31 bg-cream-20/30"
                          }`}>
                            {g.recipe_mode === "creative" ? "🎨 Creative" : "🫏 Donkey"}
                          </span>
                          {g.needs_additional_format && (
                            <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">+ratio</span>
                          )}
                          {g.needs_stock_footage && (
                            <span className="text-[10px] text-lime bg-lime/10 px-1.5 py-0.5 rounded-full">+stock</span>
                          )}
                          {g.needs_ai_voice && (
                            <span className="text-[10px] text-lime bg-lime/10 px-1.5 py-0.5 rounded-full">+AI voice</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {hasDiscount && (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[10px] text-lime bg-lime/10 px-1.5 py-0.5 rounded-full">
                                -{g.discount_pct}%
                              </span>
                              <span className="font-display text-xs text-cream-31 line-through">
                                &euro;{(lineFull / 100).toFixed(0)}
                              </span>
                            </div>
                          )}
                          <span className="font-display font-bold text-cream">
                            &euro;{(lineTotal / 100).toFixed(0)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveGroup(g.ids)}
                          className="text-cream-31 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Session items (free, non-removable) */}
              {sessionGroups.length > 0 && (
                <>
                  <div className="border-t border-border/50 my-2" />
                  {sessionGroups.map((g) => (
                    <div
                      key={g.key}
                      className="rounded-brand p-4 border border-dashed border-accent/30 bg-accent/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-cream text-sm">
                            <span className="mr-1">{g.recipe_slug === "strategy-session" ? "🧠" : "🎨"}</span>
                            {g.recipe_name}
                          </h3>
                        </div>
                        <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full font-medium">
                          Included free
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-border space-y-4">
            {totalSaved > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-lime">You save</span>
                <span className="text-lime font-medium">
                  &minus;&euro;{(totalSaved / 100).toFixed(0)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-cream-61 text-sm">Subtotal</span>
              <span className="font-display font-bold text-xl text-cream">
                &euro;{(subtotal / 100).toFixed(0)}
              </span>
            </div>
            {!user && (
              <div>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-brand bg-background border border-border text-cream text-sm placeholder:text-cream-31 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
                <p className="text-cream-31 text-[10px] mt-1.5">
                  We&apos;ll create your account after payment and send you a login link.
                </p>
              </div>
            )}
            {checkoutError && (
              <p className="text-red-400 text-xs">{checkoutError}</p>
            )}
            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              loading={checkoutLoading}
              disabled={!canCheckout}
            >
              {videosNeeded > 0
                ? `Add ${videosNeeded} more video${videosNeeded > 1 ? "s" : ""}`
                : "Proceed to checkout"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
