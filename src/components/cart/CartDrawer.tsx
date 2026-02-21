"use client";

import { useCart } from "@/providers/CartProvider";
import { getRecipeIcon } from "@/lib/constants";
import Button from "@/components/ui/Button";
import { useEffect, useState } from "react";

type GroupedItem = {
  key: string;
  recipe_name: string;
  recipe_slug: string;
  price_cents: number;
  discounted_price_cents: number;
  discount_pct: number;
  needs_additional_format: boolean;
  needs_stock_footage: boolean;
  needs_ai_voice: boolean;
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
  const { items, pricedItems, isOpen, closeCart, removeItem, itemCount, toast, clearToast } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
    const key = `${item.recipe_id}|${item.needs_additional_format}|${item.needs_stock_footage}|${item.needs_ai_voice}|${item.discount_pct}`;
    const existing = grouped.find((g) => g.key === key);
    if (existing) {
      existing.ids.push(item.id);
      existing.quantity += 1;
    } else {
      grouped.push({
        key,
        recipe_name: item.recipe_name ?? "",
        recipe_slug: item.recipe_slug ?? "",
        price_cents: item.price_cents ?? 0,
        discounted_price_cents: item.discounted_price_cents,
        discount_pct: item.discount_pct,
        needs_additional_format: item.needs_additional_format,
        needs_stock_footage: item.needs_stock_footage,
        needs_ai_voice: item.needs_ai_voice,
        ids: [item.id],
        quantity: 1,
      });
    }
  }

  const subtotal = pricedItems.reduce(
    (sum, item) => sum + item.discounted_price_cents + getExtrasTotal(item),
    0
  );

  const subtotalBeforeDiscount = pricedItems.reduce(
    (sum, item) => sum + (item.price_cents ?? 0) + getExtrasTotal(item),
    0
  );

  const totalSaved = subtotalBeforeDiscount - subtotal;

  async function handleRemoveGroup(ids: string[]) {
    for (const id of ids) {
      await removeItem(id);
    }
  }

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        closeCart();
        window.location.href = data.url;
      }
    } catch {
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

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {grouped.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-cream-31 text-sm">Your cart is empty</p>
              <p className="text-cream-20 text-xs mt-1">
                Browse recipes and add videos to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => {
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
                        {(g.needs_additional_format || g.needs_stock_footage || g.needs_ai_voice) && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
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
                        )}
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
            <Button className="w-full" size="lg" onClick={handleCheckout} loading={checkoutLoading}>
              Proceed to checkout
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
