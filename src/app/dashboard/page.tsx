"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import OrderDetailModal from "@/components/dashboard/OrderDetailModal";
import BriefFormModal from "@/components/dashboard/BriefFormModal";
import { getRecipeIcon, USER_ACTION_STATUSES, SLA_DAYS } from "@/lib/constants";

type Order = {
  id: string;
  order_number: string;
  status: string;
  recipe_id: string;
  created_at: string;
  updated_at: string;
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
  video_recipes: { name: string; slug: string; intake_form_schema: Record<string, unknown> | null } | null;
};

const COLUMNS = [
  {
    title: "Needs Brief",
    statuses: ["needs_brief"],
    actionNeeded: true,
  },
  {
    title: "Submitted",
    statuses: ["submitted"],
    actionNeeded: false,
  },
  {
    title: "In Production",
    statuses: ["awaiting_assets", "in_production"],
    actionNeeded: false,
  },
  {
    title: "Review",
    statuses: ["awaiting_feedback"],
    actionNeeded: true,
  },
  {
    title: "Completed",
    statuses: ["completed"],
    actionNeeded: false,
  },
] as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysLeft(updatedAt: string): number {
  const updated = new Date(updatedAt).getTime();
  const deadline = updated + SLA_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return Math.max(0, Math.ceil((deadline - now) / (24 * 60 * 60 * 1000)));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [briefOrder, setBriefOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("orders")
      .select("*, video_recipes(name, slug, intake_form_schema)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) || []);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleCardClick(order: Order) {
    // needs_brief or submitted → open brief form (editable)
    if (order.status === "needs_brief" || order.status === "submitted") {
      setBriefOrder(order);
    } else {
      setSelectedOrder(order);
    }
  }

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
          const showActionNeeded = col.actionNeeded && columnOrders.length > 0;

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
                {showActionNeeded && (
                  <Badge variant="warning">Action Needed</Badge>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {columnOrders.length === 0 ? (
                  <div className="border border-dashed border-border rounded-brand p-6 text-center text-cream-31 text-sm">
                    No orders
                  </div>
                ) : (
                  columnOrders.map((order) => {
                    const isInProduction = order.status === "in_production" || order.status === "awaiting_assets";
                    const isUserAction = (USER_ACTION_STATUSES as readonly string[]).includes(order.status);
                    const daysLeft = isUserAction ? getDaysLeft(order.updated_at) : null;

                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => handleCardClick(order)}
                        className={`
                          bg-surface border rounded-brand p-4 text-left
                          hover:border-accent/50 transition-colors duration-200 cursor-pointer w-full
                          ${isInProduction ? "border-accent/30 animate-pulse-glow" : "border-border"}
                        `}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {isInProduction && (
                            <span className="relative flex h-2 w-2 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                            </span>
                          )}
                          <span className="mr-0.5">{getRecipeIcon(order.video_recipes?.slug)}</span>
                          <p className="font-display font-bold text-sm text-cream truncate">
                            {order.video_recipes?.name ?? "Custom Order"}
                          </p>
                        </div>
                        <p className="text-cream-31 text-xs mb-2">
                          {order.order_number}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-cream-31 text-xs">
                            {formatDate(order.created_at)}
                          </span>
                          <div className="flex items-center gap-2">
                            {daysLeft !== null && (
                              <span className={`text-xs font-medium ${daysLeft <= 7 ? "text-red-400" : "text-cream-61"}`}>
                                {daysLeft}d left
                              </span>
                            )}
                            {isUserAction && (
                              <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                                Action needed
                              </span>
                            )}
                          </div>
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

      <BriefFormModal
        order={briefOrder}
        onClose={() => setBriefOrder(null)}
        onSaved={fetchOrders}
      />
    </div>
  );
}
