"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export type CartItem = {
  id: string;
  recipe_id: string;
  recipe_name?: string;
  recipe_slug?: string;
  price_cents?: number;
  intake_responses: Record<string, string> | null;
  notes: string | null;
  footage_folder_url: string | null;
  primary_platform: string;
  primary_aspect_ratio: string;
  needs_additional_format: boolean;
  additional_aspect_ratio: string | null;
  needs_stock_footage: boolean;
  needs_ai_voice: boolean;
};

export type AddItemExtras = {
  needs_additional_format?: boolean;
  needs_stock_footage?: boolean;
  needs_ai_voice?: boolean;
};

export type CartItemWithDiscount = CartItem & {
  discount_pct: number;
  discounted_price_cents: number;
};

type CartContextType = {
  items: CartItem[];
  pricedItems: CartItemWithDiscount[];
  lifetimeCount: number;
  loading: boolean;
  toast: string | null;
  clearToast: () => void;
  addItem: (recipeId: string, extras?: AddItemExtras) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<CartItem>) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

const CartContext = createContext<CartContextType>({
  items: [],
  pricedItems: [],
  lifetimeCount: 0,
  loading: true,
  toast: null,
  clearToast: () => {},
  addItem: async () => {},
  removeItem: async () => {},
  updateItem: async () => {},
  clearCart: async () => {},
  itemCount: 0,
  isOpen: false,
  openCart: () => {},
  closeCart: () => {},
  toggleCart: () => {},
});

type DiscountTier = { min_video_count: number; discount_percent: number };

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [lifetimeCount, setLifetimeCount] = useState(0);
  const [tiers, setTiers] = useState<DiscountTier[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const prevMaxTierRef = useRef(0);
  const { user } = useAuth();
  const supabase = createClient();

  // Fetch discount tiers once
  useEffect(() => {
    supabase
      .from("discount_tiers")
      .select("min_video_count, discount_percent")
      .order("min_video_count", { ascending: true })
      .then(({ data }) => setTiers(data ?? []));
  }, [supabase]);

  // Fetch user's lifetime video count
  const fetchVolume = useCallback(async () => {
    if (!user) {
      setLifetimeCount(0);
      return;
    }
    const { data } = await supabase
      .from("brands")
      .select("brand_volume(lifetime_video_count)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const vol = Array.isArray(data?.brand_volume)
      ? data.brand_volume[0]
      : data?.brand_volume;
    setLifetimeCount(vol?.lifetime_video_count ?? 0);
  }, [user, supabase]);

  useEffect(() => {
    fetchVolume();
  }, [fetchVolume]);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("cart_items")
      .select(`
        *,
        video_recipes (name, slug, price_cents)
      `)
      .eq("user_id", user.id)
      .order("created_at");

    const mapped = (data || []).map((item: Record<string, unknown>) => {
      const recipe = item.video_recipes as Record<string, unknown> | null;
      return {
        ...item,
        recipe_name: recipe?.name as string | undefined,
        recipe_slug: recipe?.slug as string | undefined,
        price_cents: recipe?.price_cents as number | undefined,
      };
    }) as CartItem[];

    setItems(mapped);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  function getDiscountForCount(count: number): number {
    let pct = 0;
    for (const tier of tiers) {
      if (count >= tier.min_video_count) pct = tier.discount_percent;
    }
    return pct;
  }

  // Optimized discount: assign highest discount % to the most expensive items
  const pricedItems: CartItemWithDiscount[] = (() => {
    if (items.length === 0 || tiers.length === 0) {
      return items.map((item) => ({
        ...item,
        discount_pct: 0,
        discounted_price_cents: item.price_cents ?? 0,
      }));
    }

    // 1. Collect the discount slots earned by each cart position
    const discountSlots: number[] = items.map((_, index) => {
      const videoNumber = lifetimeCount + index + 1;
      return getDiscountForCount(videoNumber);
    });

    // 2. Sort slots descending (highest discounts first)
    const sortedSlots = [...discountSlots].sort((a, b) => b - a);

    // 3. Sort items by price descending, preserving original index
    const indexed = items.map((item, i) => ({ item, origIndex: i, price: item.price_cents ?? 0 }));
    const byPrice = [...indexed].sort((a, b) => b.price - a.price);

    // 4. Assign: highest discount slot → most expensive item
    const assignedPcts = new Array<number>(items.length).fill(0);
    byPrice.forEach((entry, rank) => {
      assignedPcts[entry.origIndex] = sortedSlots[rank] ?? 0;
    });

    return items.map((item, i) => {
      const pct = assignedPcts[i];
      const base = item.price_cents ?? 0;
      const discounted = Math.round(base * (1 - pct / 100));
      return { ...item, discount_pct: pct, discounted_price_cents: discounted };
    });
  })();

  // Detect when a new tier is crossed and show toast
  useEffect(() => {
    if (items.length === 0 || tiers.length === 0) return;
    const maxPct = Math.max(...pricedItems.map((p) => p.discount_pct), 0);
    if (maxPct > prevMaxTierRef.current && prevMaxTierRef.current >= 0) {
      if (prevMaxTierRef.current > 0 || items.length > 1) {
        // Only toast if it's a genuine tier unlock (not initial load with existing discount)
        setToast(
          `You just unlocked ${maxPct}% off! We applied it to your most expensive video to maximize your savings.`
        );
        setTimeout(() => setToast(null), 5000);
      }
    }
    prevMaxTierRef.current = maxPct;
  }, [items.length, tiers, pricedItems]);

  async function addItem(recipeId: string, extras?: AddItemExtras) {
    if (!user) return;

    const { data } = await supabase
      .from("cart_items")
      .insert({
        user_id: user.id,
        recipe_id: recipeId,
        primary_platform: "instagram_reels",
        primary_aspect_ratio: "9:16",
        needs_additional_format: extras?.needs_additional_format ?? false,
        needs_stock_footage: extras?.needs_stock_footage ?? false,
        needs_ai_voice: extras?.needs_ai_voice ?? false,
      })
      .select()
      .single();

    if (data) {
      await fetchCart();
      setIsOpen(true);
    }
  }

  async function removeItem(itemId: string) {
    await supabase.from("cart_items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function updateItem(itemId: string, updates: Partial<CartItem>) {
    await supabase.from("cart_items").update(updates).eq("id", itemId);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
    );
  }

  async function clearCart() {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    setItems([]);
  }

  return (
    <CartContext.Provider
      value={{
        items,
        pricedItems,
        lifetimeCount,
        loading,
        toast,
        clearToast: () => setToast(null),
        addItem,
        removeItem,
        updateItem,
        clearCart,
        itemCount: items.length,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        toggleCart: () => setIsOpen((p) => !p),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
