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
import { getUnlockState, type Milestone } from "@/lib/unlocks";

const GUEST_CART_KEY = "kaimakki_guest_cart";

export type CartItem = {
  id: string;
  recipe_id: string;
  recipe_name?: string;
  recipe_slug?: string;
  recipe_type?: string;
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
  needs_expedited: boolean;
  recipe_mode: string;
  selected_use_case?: string;
};

export type AddItemExtras = {
  needs_additional_format?: boolean;
  needs_stock_footage?: boolean;
  needs_ai_voice?: boolean;
  needs_expedited?: boolean;
  recipe_mode?: "donkey" | "creative";
  selected_use_case?: string;
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
  videoItemCount: number;
  isFirstTimeBuyer: boolean;
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
  videoItemCount: 0,
  isFirstTimeBuyer: false,
  isOpen: false,
  openCart: () => {},
  closeCart: () => {},
  toggleCart: () => {},
});

function saveGuestCart(cartItems: CartItem[]) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartItems));
  } catch {
    // localStorage full or unavailable
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [lifetimeCount, setLifetimeCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [sessionRecipeIds, setSessionRecipeIds] = useState<{ id: string; slug: string }[]>([]);
  const prevMaxTierRef = useRef(0);
  const { user } = useAuth();
  const supabase = createClient();

  const isFirstTimeBuyer = lifetimeCount === 0;

  // Fetch unlock milestones + session recipe IDs once
  useEffect(() => {
    supabase
      .from("unlock_milestones")
      .select("*")
      .order("min_videos", { ascending: true })
      .then(({ data }) => setMilestones((data ?? []) as Milestone[]));

    supabase
      .from("video_recipes")
      .select("id, slug")
      .eq("recipe_type", "session")
      .then(({ data }) => setSessionRecipeIds(data ?? []));
  }, [supabase]);

  // Fetch user's video counts
  const fetchVolume = useCallback(async () => {
    if (!user) {
      setLifetimeCount(0);
      setApprovedCount(0);
      return;
    }
    const { data } = await supabase
      .from("brands")
      .select("brand_volume(lifetime_video_count, approved_video_count)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const vol = Array.isArray(data?.brand_volume)
      ? data.brand_volume[0]
      : data?.brand_volume;
    setLifetimeCount(vol?.lifetime_video_count ?? 0);
    setApprovedCount(vol?.approved_video_count ?? 0);
  }, [user, supabase]);

  useEffect(() => {
    fetchVolume();
  }, [fetchVolume]);

  const fetchCart = useCallback(async () => {
    if (!user) {
      // Guest mode: load from localStorage
      try {
        const stored = localStorage.getItem(GUEST_CART_KEY);
        setItems(stored ? JSON.parse(stored) : []);
      } catch {
        setItems([]);
      }
      setLoading(false);
      return;
    }

    // Merge any guest cart items into DB before fetching
    try {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (stored) {
        const guestItems = JSON.parse(stored) as CartItem[];
        for (const item of guestItems) {
          await supabase.from("cart_items").insert({
            user_id: user.id,
            recipe_id: item.recipe_id,
            primary_platform: item.primary_platform,
            primary_aspect_ratio: item.primary_aspect_ratio,
            needs_additional_format: item.needs_additional_format,
            needs_stock_footage: item.needs_stock_footage,
            needs_ai_voice: item.needs_ai_voice,
            recipe_mode: item.recipe_mode,
            selected_use_case: item.selected_use_case ?? null,
          });
        }
        localStorage.removeItem(GUEST_CART_KEY);
      }
    } catch {
      // ignore parse errors
    }

    const { data } = await supabase
      .from("cart_items")
      .select(`
        *,
        video_recipes (name, slug, price_cents, recipe_type, creative_surcharge_percent)
      `)
      .eq("user_id", user.id)
      .order("created_at");

    const mapped = (data || []).map((item: Record<string, unknown>) => {
      const recipe = item.video_recipes as Record<string, unknown> | null;
      const rawPrice = recipe?.price_cents as number | undefined;
      const surcharge = (recipe?.creative_surcharge_percent as number) ?? 25;
      const itemMode = (item.recipe_mode as string) ?? "donkey";
      const effectivePrice = itemMode === "creative" && rawPrice
        ? Math.round(rawPrice * (1 + surcharge / 100))
        : rawPrice;
      return {
        ...item,
        recipe_name: recipe?.name as string | undefined,
        recipe_slug: recipe?.slug as string | undefined,
        recipe_type: recipe?.recipe_type as string | undefined,
        price_cents: effectivePrice,
        selected_use_case: item.selected_use_case as string | undefined,
      };
    }) as CartItem[];

    setItems(mapped);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const sessionRecipeIdSet = new Set(sessionRecipeIds.map((s) => s.id));
  const videoItems = items.filter((i) => !sessionRecipeIdSet.has(i.recipe_id));
  const sessionItems = items.filter((i) => sessionRecipeIdSet.has(i.recipe_id));
  const videoItemCount = videoItems.length;

  function getDiscountForCount(count: number): number {
    let pct = 0;
    for (const ms of milestones) {
      if (count >= ms.min_videos) pct = Math.max(pct, ms.discount_percent);
    }
    return pct;
  }

  // Optimized discount: assign highest discount % to the most expensive items
  // Only apply discounts to video items, not sessions
  const pricedItems: CartItemWithDiscount[] = (() => {
    if (items.length === 0 || milestones.length === 0) {
      return items.map((item) => ({
        ...item,
        discount_pct: 0,
        discounted_price_cents: item.price_cents ?? 0,
      }));
    }

    // 1. Collect the discount slots earned by each video cart position (based on approved count)
    const discountSlots: number[] = videoItems.map((_, index) => {
      const videoNumber = approvedCount + index + 1;
      return getDiscountForCount(videoNumber);
    });

    // 2. Sort slots descending (highest discounts first)
    const sortedSlots = [...discountSlots].sort((a, b) => b - a);

    // 3. Sort video items by price descending, preserving original index
    const indexed = videoItems.map((item, i) => ({ item, origIndex: i, price: item.price_cents ?? 0 }));
    const byPrice = [...indexed].sort((a, b) => b.price - a.price);

    // 4. Assign: highest discount slot → most expensive item
    const assignedPcts = new Array<number>(videoItems.length).fill(0);
    byPrice.forEach((entry, rank) => {
      assignedPcts[entry.origIndex] = sortedSlots[rank] ?? 0;
    });

    // Build priced items: videos with discounts, sessions at €0
    const pricedVideos = videoItems.map((item, i) => {
      const pct = assignedPcts[i];
      const base = item.price_cents ?? 0;
      const discounted = Math.round(base * (1 - pct / 100));
      return { ...item, discount_pct: pct, discounted_price_cents: discounted };
    });

    const pricedSessions = sessionItems.map((item) => ({
      ...item,
      discount_pct: 0,
      discounted_price_cents: 0,
    }));

    return [...pricedVideos, ...pricedSessions];
  })();

  // Detect when a new tier is crossed and show toast
  useEffect(() => {
    if (items.length === 0 || milestones.length === 0) return;
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
  }, [items.length, milestones, pricedItems]);

  async function ensureSessionItems() {
    if (!user || sessionRecipeIds.length === 0) return;
    // Check if sessions are already in cart
    const existingSessionIds = new Set(sessionItems.map((i) => i.recipe_id));
    const missing = sessionRecipeIds.filter((s) => !existingSessionIds.has(s.id));
    if (missing.length === 0) return;

    for (const session of missing) {
      await supabase.from("cart_items").insert({
        user_id: user.id,
        recipe_id: session.id,
        primary_platform: "n/a",
        primary_aspect_ratio: "n/a",
        needs_additional_format: false,
        needs_stock_footage: false,
        needs_ai_voice: false,
      });
    }
  }

  async function removeSessionItems() {
    if (!user || sessionItems.length === 0) return;
    for (const item of sessionItems) {
      await supabase.from("cart_items").delete().eq("id", item.id);
    }
  }

  async function addItem(recipeId: string, extras?: AddItemExtras) {
    if (!user) {
      // Guest mode: fetch recipe details and store in localStorage
      const { data: recipe } = await supabase
        .from("video_recipes")
        .select("name, slug, price_cents, recipe_type, creative_surcharge_percent")
        .eq("id", recipeId)
        .single();

      if (!recipe) return;

      const mode = extras?.recipe_mode ?? "donkey";
      const rawPrice = recipe.price_cents;
      const surcharge = recipe.creative_surcharge_percent ?? 25;
      const effectivePrice = mode === "creative"
        ? Math.round(rawPrice * (1 + surcharge / 100))
        : rawPrice;

      const newItem: CartItem = {
        id: crypto.randomUUID(),
        recipe_id: recipeId,
        recipe_name: recipe.name,
        recipe_slug: recipe.slug,
        recipe_type: recipe.recipe_type,
        price_cents: effectivePrice,
        intake_responses: null,
        notes: null,
        footage_folder_url: null,
        primary_platform: "instagram_reels",
        primary_aspect_ratio: "9:16",
        needs_additional_format: extras?.needs_additional_format ?? false,
        additional_aspect_ratio: null,
        needs_stock_footage: extras?.needs_stock_footage ?? false,
        needs_ai_voice: extras?.needs_ai_voice ?? false,
        needs_expedited: extras?.needs_expedited ?? false,
        recipe_mode: mode,
        selected_use_case: extras?.selected_use_case,
      };

      const updated = [...items, newItem];
      setItems(updated);
      saveGuestCart(updated);
      setIsOpen(true);
      return;
    }

    // Validate recipe is unlocked for this user
    if (milestones.length > 0) {
      const { data: recipe } = await supabase
        .from("video_recipes")
        .select("slug")
        .eq("id", recipeId)
        .single();

      if (recipe) {
        const unlock = getUnlockState(approvedCount, milestones);
        if (!unlock.unlockedRecipeSlugs.has(recipe.slug)) {
          setToast("That recipe isn't unlocked yet. Post more videos to unlock it!");
          setTimeout(() => setToast(null), 4000);
          return;
        }

        // Validate add-on extras
        if (extras?.needs_additional_format && !unlock.landscapeUnlocked) {
          setToast("Additional format isn't unlocked yet.");
          setTimeout(() => setToast(null), 4000);
          return;
        }
        if (extras?.needs_stock_footage && !unlock.unlockedAddons.has("stock_footage")) {
          setToast("Stock footage isn't unlocked yet.");
          setTimeout(() => setToast(null), 4000);
          return;
        }
        if (extras?.needs_ai_voice && !unlock.unlockedAddons.has("ai_voice")) {
          setToast("AI voiceover isn't unlocked yet.");
          setTimeout(() => setToast(null), 4000);
          return;
        }
        if (extras?.needs_expedited && !unlock.unlockedAddons.has("expedited")) {
          setToast("Expedited delivery isn't unlocked yet.");
          setTimeout(() => setToast(null), 4000);
          return;
        }
      }
    }

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
        needs_expedited: extras?.needs_expedited ?? false,
        recipe_mode: extras?.recipe_mode ?? "donkey",
        selected_use_case: extras?.selected_use_case ?? null,
      })
      .select()
      .single();

    if (data) {
      // Auto-add session items for first-time buyers
      if (isFirstTimeBuyer && sessionItems.length === 0) {
        await ensureSessionItems();
      }
      await fetchCart();
      setIsOpen(true);
    }
  }

  async function removeItem(itemId: string) {
    if (!user) {
      const remaining = items.filter((i) => i.id !== itemId);
      setItems(remaining);
      saveGuestCart(remaining);
      return;
    }

    // Don't allow removing session items directly
    const item = items.find((i) => i.id === itemId);
    if (item && sessionRecipeIdSet.has(item.recipe_id)) return;

    await supabase.from("cart_items").delete().eq("id", itemId);
    const remaining = items.filter((i) => i.id !== itemId);
    setItems(remaining);

    // If no video items left, remove session items too
    const remainingVideos = remaining.filter((i) => !sessionRecipeIdSet.has(i.recipe_id));
    if (remainingVideos.length === 0 && isFirstTimeBuyer) {
      await removeSessionItems();
      setItems([]);
    }
  }

  async function updateItem(itemId: string, updates: Partial<CartItem>) {
    if (!user) {
      const updated = items.map((i) => (i.id === itemId ? { ...i, ...updates } : i));
      setItems(updated);
      saveGuestCart(updated);
      return;
    }

    await supabase.from("cart_items").update(updates).eq("id", itemId);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
    );
  }

  async function clearCart() {
    if (!user) {
      setItems([]);
      localStorage.removeItem(GUEST_CART_KEY);
      return;
    }
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
        videoItemCount,
        isFirstTimeBuyer,
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
