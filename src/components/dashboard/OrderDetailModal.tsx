"use client";

import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { getRecipeIcon } from "@/lib/constants";

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
  video_recipes: { name: string; slug: string } | null;
};

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
}

const statusVariantMap: Record<string, "default" | "warning" | "accent" | "pink" | "success"> = {
  needs_brief: "warning",
  submitted: "default",
  awaiting_assets: "warning",
  in_production: "accent",
  awaiting_feedback: "pink",
  completed: "success",
};

const timelineSteps = ["needs_brief", "submitted", "in_production", "awaiting_feedback", "completed"];
const timelineLabels: Record<string, string> = {
  needs_brief: "Needs Brief",
  submitted: "Submitted",
  in_production: "In Production",
  awaiting_feedback: "Awaiting Feedback",
  completed: "Completed",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  if (!order) return null;

  const currentStepIndex = timelineSteps.indexOf(order.status);
  const hasDeliverables = order.deliverable_url || order.revision_deliverable_url;

  return (
    <Modal isOpen={!!order} onClose={onClose} title={order.order_number} size="lg">
      {/* Header area */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          {order.video_recipes?.name && (
            <p className="text-cream-61 text-sm">
              <span className="mr-1">{getRecipeIcon(order.video_recipes.slug)}</span>
              {order.video_recipes.name}
            </p>
          )}
          <p className="text-cream-31 text-xs mt-1">
            Ordered {formatDate(order.created_at)}
          </p>
        </div>
        <Badge variant={statusVariantMap[order.status] ?? "default"}>
          {formatStatus(order.status)}
        </Badge>
      </div>

      {/* Status Timeline */}
      <div className="border-t border-border pt-5 pb-5">
        <h3 className="text-cream text-sm font-semibold mb-4">Progress</h3>
        <div className="flex items-center gap-1">
          {timelineSteps.map((step, i) => {
            const isReached = i <= currentStepIndex;
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isReached ? "bg-accent" : "bg-border"
                    }`}
                  />
                  <span
                    className={`text-[10px] mt-1.5 text-center ${
                      isReached ? "text-cream" : "text-cream-31"
                    }`}
                  >
                    {timelineLabels[step]}
                  </span>
                </div>
                {i < timelineSteps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 -mt-4 ${
                      i < currentStepIndex ? "bg-accent" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details */}
      <div className="border-t border-border pt-5 pb-5">
        <h3 className="text-cream text-sm font-semibold mb-3">Order Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-cream-31 text-xs">Platform</p>
            <p className="text-cream">{order.primary_platform}</p>
          </div>
          <div>
            <p className="text-cream-31 text-xs">Aspect Ratio</p>
            <p className="text-cream">{order.primary_aspect_ratio}</p>
          </div>
          {order.needs_additional_format && order.additional_aspect_ratio && (
            <div>
              <p className="text-cream-31 text-xs">Additional Format</p>
              <p className="text-cream">{order.additional_aspect_ratio}</p>
            </div>
          )}
        </div>

        {order.notes && (
          <div className="mt-4">
            <p className="text-cream-31 text-xs mb-1">Notes</p>
            <p className="text-cream-61 text-sm bg-background rounded-brand p-3">
              {order.notes}
            </p>
          </div>
        )}

        {order.footage_folder_url && (
          <div className="mt-4">
            <p className="text-cream-31 text-xs mb-1">Footage Folder</p>
            <a
              href={order.footage_folder_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent text-sm hover:underline"
            >
              Open footage folder
            </a>
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="border-t border-border pt-5 pb-5">
        <h3 className="text-cream text-sm font-semibold mb-3">Pricing</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-cream-61">
            <span>List price</span>
            <span>&euro;{formatCents(order.list_price_cents)}</span>
          </div>
          {order.discount_cents > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Discount ({order.discount_percent}%)</span>
              <span>-&euro;{formatCents(order.discount_cents)}</span>
            </div>
          )}
          {order.surcharge_cents > 0 && (
            <div className="flex justify-between text-cream-61">
              <span>Surcharges</span>
              <span>+&euro;{formatCents(order.surcharge_cents)}</span>
            </div>
          )}
          <div className="flex justify-between text-cream font-bold text-base pt-2 border-t border-border">
            <span>Total</span>
            <span>&euro;{formatCents(order.total_charged_cents)}</span>
          </div>
        </div>
      </div>

      {/* Deliverables */}
      {hasDeliverables && (
        <div className="border-t border-border pt-5 pb-5">
          <h3 className="text-cream text-sm font-semibold mb-3">Deliverables</h3>
          <div className="space-y-2">
            {order.deliverable_url && (
              <a
                href={order.deliverable_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-accent text-sm hover:underline"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                </svg>
                Download deliverable
              </a>
            )}
            {order.revision_deliverable_url && (
              <a
                href={order.revision_deliverable_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-accent text-sm hover:underline"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                </svg>
                Revised Version
              </a>
            )}
          </div>
        </div>
      )}

      {/* Estimated Delivery */}
      {order.estimated_delivery_date && (
        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-cream-31">Estimated Delivery</span>
            <span className="text-cream">{formatDate(order.estimated_delivery_date)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
