"use client";

import { useCart } from "@/providers/CartProvider";
import Button from "@/components/ui/Button";
import { useEffect, useState } from "react";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, itemCount } = useCart();
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

  const subtotal = items.reduce((sum, item) => sum + (item.price_cents || 0), 0);

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

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-cream-31 text-sm">Your cart is empty</p>
              <p className="text-cream-20 text-xs mt-1">
                Browse recipes and add videos to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-background rounded-brand p-4 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-cream text-sm">
                        {item.recipe_name}
                      </h3>
                      <p className="text-cream-31 text-xs mt-1">
                        {item.intake_responses
                          ? "Details filled"
                          : "Details needed at checkout"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-cream">
                        &euro;{((item.price_cents || 0) / 100).toFixed(0)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-cream-31 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-cream-61 text-sm">Subtotal</span>
              <span className="font-display font-bold text-xl text-cream">
                &euro;{(subtotal / 100).toFixed(0)}
              </span>
            </div>
            <p className="text-cream-20 text-xs">
              Volume discounts applied at checkout
            </p>
            <Button className="w-full" size="lg" onClick={handleCheckout} loading={checkoutLoading}>
              Proceed to checkout
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
