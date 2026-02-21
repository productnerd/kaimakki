"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
};

type CartContextType = {
  items: CartItem[];
  loading: boolean;
  addItem: (recipeId: string) => Promise<void>;
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
  loading: true,
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

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

  async function addItem(recipeId: string) {
    if (!user) return;

    const { data } = await supabase
      .from("cart_items")
      .insert({
        user_id: user.id,
        recipe_id: recipeId,
        primary_platform: "instagram_reels",
        primary_aspect_ratio: "9:16",
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
        loading,
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
