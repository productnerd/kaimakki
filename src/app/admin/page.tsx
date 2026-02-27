"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Input from "@/components/ui/Input";
import AdminOrderModal from "@/components/admin/AdminOrderModal";
import { getRecipeIcon } from "@/lib/constants";

type AdminOrder = {
  id: string;
  order_number: string;
  status: string;
  user_id: string;
  brand_id: string;
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
  assigned_to: string | null;
  estimated_delivery_date: string | null;
  video_recipes: { name: string; slug: string } | null;
  profiles: { full_name: string | null; phone: string | null; email: string } | null;
  brands: { name: string } | null;
};

type BadgeVariant = "default" | "accent" | "lime" | "pink" | "warning" | "success";

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  needs_brief: { label: "Needs Brief", variant: "warning" },
  submitted: { label: "Submitted", variant: "default" },
  awaiting_assets: { label: "Awaiting Assets", variant: "warning" },
  in_production: { label: "In Production", variant: "accent" },
  awaiting_feedback: { label: "Awaiting Feedback", variant: "pink" },
  completed: { label: "Completed", variant: "success" },
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "needs_brief", label: "Needs Brief" },
  { value: "submitted", label: "Submitted" },
  { value: "awaiting_assets", label: "Awaiting Assets" },
  { value: "in_production", label: "In Production" },
  { value: "awaiting_feedback", label: "Awaiting Feedback" },
  { value: "completed", label: "Completed" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export default function AdminOrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  function fetchOrders() {
    const supabase = createClient();
    supabase
      .from("orders")
      .select("*, video_recipes(name, slug), profiles(full_name, phone, email), brands(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data as AdminOrder[]) || []);
        setLoading(false);
      });
  }

  useEffect(() => {
    if (!profile?.is_admin) return;
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (loading) {
    return <LoadingSpinner className="py-20" />;
  }

  const filtered = orders.filter((order) => {
    if (statusFilter !== "all" && order.status !== statusFilter) return false;

    if (search) {
      const q = search.toLowerCase();
      const matchesOrderNumber = order.order_number.toLowerCase().includes(q);
      const matchesClient = order.profiles?.full_name?.toLowerCase().includes(q);
      if (!matchesOrderNumber && !matchesClient) return false;
    }

    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="
            px-4 py-2.5 rounded-brand
            bg-surface border border-border
            text-cream text-sm
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
            transition-colors duration-150
          "
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <Input
          placeholder="Search by order # or client name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-brand border border-border">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">
                Order #
              </th>
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">
                Recipe
              </th>
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">
                Client
              </th>
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">
                Brand
              </th>
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">
                Date
              </th>
              <th className="text-right text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-cream-31 text-sm"
                >
                  No orders found
                </td>
              </tr>
            ) : (
              filtered.map((order) => {
                const badge = STATUS_BADGE[order.status] ?? {
                  label: order.status,
                  variant: "default" as BadgeVariant,
                };

                return (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="border-b border-border last:border-b-0 hover:bg-background/50 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-4 py-3 text-sm text-cream font-medium">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-cream">
                      {order.video_recipes ? (
                        <span>{getRecipeIcon(order.video_recipes.slug)} {order.video_recipes.name}</span>
                      ) : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm text-cream">
                      <span className="flex items-center gap-2">
                        {order.profiles?.full_name ?? "\u2014"}
                        {order.profiles?.phone && (
                          <a
                            href={formatWhatsAppUrl(order.profiles.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-green-400 hover:text-green-300 flex-shrink-0"
                            title="Open WhatsApp"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          </a>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-cream">
                      {order.brands?.name ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-cream-61">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-cream text-right">
                      &euro;{(order.total_charged_cents / 100).toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AdminOrderModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdated={fetchOrders}
      />
    </div>
  );
}
