"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
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

interface AdminOrderModalProps {
  order: AdminOrder | null;
  onClose: () => void;
  onUpdated: () => void;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  needs_brief: ["submitted", "cancelled"],
  submitted: ["awaiting_assets", "in_production", "cancelled"],
  awaiting_assets: ["in_production", "cancelled"],
  in_production: ["awaiting_feedback", "cancelled"],
  awaiting_feedback: ["completed", "in_production"],
  completed: [],
  cancelled: [],
};

const STATUS_BADGE_VARIANT: Record<string, "default" | "warning" | "accent" | "pink" | "success"> = {
  needs_brief: "warning",
  submitted: "default",
  awaiting_assets: "warning",
  in_production: "accent",
  awaiting_feedback: "pink",
  completed: "success",
  cancelled: "default",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export default function AdminOrderModal({ order, onClose, onUpdated }: AdminOrderModalProps) {
  const [newStatus, setNewStatus] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [deliverableSaving, setDeliverableSaving] = useState(false);

  const [revisionUrl, setRevisionUrl] = useState("");
  const [revisionSaving, setRevisionSaving] = useState(false);

  // Reset local state when a new order opens
  const [prevOrderId, setPrevOrderId] = useState<string | null>(null);
  if (order && order.id !== prevOrderId) {
    setPrevOrderId(order.id);
    setNewStatus("");
    setDeliverableUrl(order.deliverable_url ?? "");
    setRevisionUrl(order.revision_deliverable_url ?? "");
  }

  if (!order) return null;

  const transitions = VALID_TRANSITIONS[order.status] ?? [];
  const badgeVariant = STATUS_BADGE_VARIANT[order.status] ?? "default";

  async function handleStatusUpdate() {
    if (!newStatus || !order) return;
    setStatusLoading(true);
    const supabase = createClient();
    await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
    setStatusLoading(false);
    setNewStatus("");
    onUpdated();
  }

  async function handleDeliverableSave() {
    if (!order) return;
    setDeliverableSaving(true);
    const supabase = createClient();
    await supabase.from("orders").update({ deliverable_url: deliverableUrl || null }).eq("id", order.id);
    setDeliverableSaving(false);
    onUpdated();
  }

  async function handleRevisionSave() {
    if (!order) return;
    setRevisionSaving(true);
    const supabase = createClient();
    await supabase.from("orders").update({ revision_deliverable_url: revisionUrl || null }).eq("id", order.id);
    setRevisionSaving(false);
    onUpdated();
  }

  const phone = order.profiles?.phone;
  const whatsappUrl = phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : null;

  return (
    <Modal isOpen={!!order} onClose={onClose} title={`Order ${order.order_number}`} size="xl">
      {/* Subtitle & Status Badge */}
      <div className="flex items-center gap-3 mb-6">
        {order.video_recipes?.name && (
          <p className="text-cream-61 text-sm">{getRecipeIcon(order.video_recipes.slug)} {order.video_recipes.name}</p>
        )}
        <Badge variant={badgeVariant}>{formatStatus(order.status)}</Badge>
      </div>

      {/* Client Info */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-cream-31 uppercase tracking-wider mb-3">Client</h3>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-cream">
          {order.profiles?.full_name && <span>{order.profiles.full_name}</span>}
          <span className="text-cream-61">{order.profiles?.email}</span>
          {phone && <span className="text-cream-61">{phone}</span>}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-green-400 hover:text-green-300 transition-colors text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.555 4.126 1.528 5.861L.06 23.487a.5.5 0 00.613.613l5.626-1.468A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.94 9.94 0 01-5.38-1.564l-.386-.232-3.338.87.87-3.338-.232-.386A9.94 9.94 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
              WhatsApp
            </a>
          )}
        </div>
        {order.brands?.name && (
          <p className="text-sm text-cream-61 mt-1">Brand: {order.brands.name}</p>
        )}
      </section>

      <div className="border-t border-border" />

      {/* Status Management */}
      <section className="py-6">
        <h3 className="text-sm font-medium text-cream-31 uppercase tracking-wider mb-3">Status</h3>
        {transitions.length > 0 ? (
          <div className="flex items-end gap-3">
            <Select
              label="Move to"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              options={[
                { value: "", label: "Select status..." },
                ...transitions.map((s) => ({ value: s, label: formatStatus(s) })),
              ]}
            />
            <Button
              onClick={handleStatusUpdate}
              loading={statusLoading}
              disabled={!newStatus}
              size="sm"
            >
              Update Status
            </Button>
          </div>
        ) : (
          <p className="text-sm text-cream-61">
            This order is <strong>{formatStatus(order.status)}</strong> and cannot be transitioned further.
          </p>
        )}
      </section>

      <div className="border-t border-border" />

      {/* Deliverable Management */}
      <section className="py-6">
        <h3 className="text-sm font-medium text-cream-31 uppercase tracking-wider mb-3">Deliverables</h3>
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Deliverable URL"
                value={deliverableUrl}
                onChange={(e) => setDeliverableUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button onClick={handleDeliverableSave} loading={deliverableSaving} size="sm" variant="secondary">
              Save
            </Button>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Revision Deliverable URL"
                value={revisionUrl}
                onChange={(e) => setRevisionUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button onClick={handleRevisionSave} loading={revisionSaving} size="sm" variant="secondary">
              Save
            </Button>
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Order Details (read-only) */}
      <section className="py-6">
        <h3 className="text-sm font-medium text-cream-31 uppercase tracking-wider mb-3">Order Details</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-cream-31">Platform</dt>
            <dd className="text-cream">{order.primary_platform}</dd>
          </div>
          <div>
            <dt className="text-cream-31">Aspect Ratio</dt>
            <dd className="text-cream">{order.primary_aspect_ratio}</dd>
          </div>
          <div>
            <dt className="text-cream-31">Additional Format</dt>
            <dd className="text-cream">
              {order.needs_additional_format
                ? order.additional_aspect_ratio ?? "Yes"
                : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-cream-31">Created</dt>
            <dd className="text-cream">{new Date(order.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>

        {order.notes && (
          <div className="mt-4">
            <p className="text-sm text-cream-31 mb-1">Notes</p>
            <p className="text-sm text-cream bg-background rounded-brand p-3">{order.notes}</p>
          </div>
        )}

        {order.footage_folder_url && (
          <div className="mt-4">
            <p className="text-sm text-cream-31 mb-1">Footage Folder</p>
            <a
              href={order.footage_folder_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline break-all"
            >
              {order.footage_folder_url}
            </a>
          </div>
        )}

        {order.intake_responses && Object.keys(order.intake_responses).length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-cream-31 mb-2">Intake Responses</p>
            <dl className="space-y-2 text-sm bg-background rounded-brand p-3">
              {Object.entries(order.intake_responses).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-cream-31">{key}</dt>
                  <dd className="text-cream">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      {/* Pricing Summary */}
      <section className="pt-6">
        <h3 className="text-sm font-medium text-cream-31 uppercase tracking-wider mb-3">Pricing</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-cream-61">List Price</dt>
            <dd className="text-cream">{formatCents(order.list_price_cents)}</dd>
          </div>
          {order.discount_cents > 0 && (
            <div className="flex justify-between">
              <dt className="text-cream-61">Discount ({order.discount_percent}%)</dt>
              <dd className="text-green-400">-{formatCents(order.discount_cents)}</dd>
            </div>
          )}
          {order.surcharge_cents > 0 && (
            <div className="flex justify-between">
              <dt className="text-cream-61">Surcharges</dt>
              <dd className="text-cream">+{formatCents(order.surcharge_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 font-medium">
            <dt className="text-cream">Total Charged</dt>
            <dd className="text-cream">{formatCents(order.total_charged_cents)}</dd>
          </div>
        </dl>
      </section>
    </Modal>
  );
}
