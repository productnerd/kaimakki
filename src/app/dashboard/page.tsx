"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import OrderDetailModal from "@/components/dashboard/OrderDetailModal";

type Order = {
  id: string;
  order_number: string;
  status: string;
  recipe_id: string;
  created_at: string;
  notes: string | null;
  footage_folder_url: string | null;
  primary_platform: string;
  primary_aspect_ratio: string;
  needs_additional_format: boolean;
  additional_aspect_ratio: string | null;
  intake_responses: Record<string, unknown> | null;
  list_price_cents: number;
  discount_percent: number;
  discount_cents: number;
  surcharge_cents: number;
  total_charged_cents: number;
  deliverable_url: string | null;
  revision_deliverable_url: string | null;
  estimated_delivery_date: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  video_recipes: { name: string } | null;
};

type BadgeVariant = "default" | "accent" | "lime" | "pink" | "warning" | "success";

const COLUMNS = [
  {
    title: "Submitted",
    statuses: ["submitted"],
  },
  {
    title: "In Production",
    statuses: ["awaiting_assets", "in_production"],
  },
  {
    title: "Review",
    statuses: ["awaiting_feedback"],
  },
  {
    title: "Completed",
    statuses: ["completed"],
  },
] as const;

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  submitted: { label: "Submitted", variant: "default" },
  awaiting_assets: { label: "Awaiting Assets", variant: "warning" },
  in_production: { label: "In Production", variant: "accent" },
  awaiting_feedback: { label: "Awaiting Feedback", variant: "pink" },
  completed: { label: "Completed", variant: "success" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    supabase
      .from("orders")
      .select("*, video_recipes(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders(data || []);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <h2 className="font-display font-bold text-2xl text-cream mb-2">
          No orders yet
        </h2>
        <p className="text-cream-61 mb-6">
          Pick a video recipe and place your first order.
        </p>
        <Link
          href="/"
          className="text-accent font-medium hover:underline"
        >
          Buy a video
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Kanban board */}
      <div className="flex flex-col lg:flex-row gap-6 lg:overflow-x-auto lg:pb-4">
        {COLUMNS.map((col) => {
          const columnOrders = orders.filter((o) =>
            (col.statuses as readonly string[]).includes(o.status)
          );

          return (
            <div
              key={col.title}
              className="flex-shrink-0 lg:w-72 w-full"
            >
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-display font-bold text-sm text-cream-61 uppercase tracking-wider">
                  {col.title}
                </h2>
                <span className="text-cream-31 text-xs">
                  {columnOrders.length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {columnOrders.length === 0 ? (
                  <div className="border border-dashed border-border rounded-brand p-6 text-center text-cream-31 text-sm">
                    No orders
                  </div>
                ) : (
                  columnOrders.map((order) => {
                    const badge = STATUS_BADGE[order.status] ?? {
                      label: order.status,
                      variant: "default" as BadgeVariant,
                    };

                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="bg-surface border border-border rounded-brand p-4 text-left hover:border-accent/50 transition-colors duration-200 cursor-pointer w-full"
                      >
                        <p className="font-display font-bold text-sm text-cream mb-1 truncate">
                          {order.video_recipes?.name ?? "Custom Order"}
                        </p>
                        <p className="text-cream-31 text-xs mb-2">
                          {order.order_number}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-cream-31 text-xs">
                            {formatDate(order.created_at)}
                          </span>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
