"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type CustomRequest = {
  id: string;
  request_type: string;
  description: string;
  reference_url: string | null;
  budget_range: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_id: string;
  brand_id: string | null;
  profiles: { full_name: string | null; email: string; phone: string | null } | null;
  brands: { name: string } | null;
};

type BadgeVariant = "default" | "accent" | "warning" | "success";

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Pending", variant: "warning" },
  quoted: { label: "Quoted", variant: "accent" },
  converted: { label: "Converted", variant: "success" },
  declined: { label: "Declined", variant: "default" },
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "quoted", label: "Quoted" },
  { value: "converted", label: "Converted" },
  { value: "declined", label: "Declined" },
];

function formatRequestType(type: string): string {
  if (type === "make_this") return "Make This";
  if (type === "custom_brief") return "Custom Brief";
  return type;
}

function formatBudget(range: string | null): string {
  if (!range) return "-";
  if (range === "under_200") return "Under \u20AC200";
  if (range === "200_400") return "\u20AC200 - \u20AC400";
  if (range === "400_plus") return "\u20AC400+";
  if (range === "not_sure") return "Not sure";
  return range;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

export default function AdminRequestsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [editStatus, setEditStatus] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!profile?.is_admin) return;

    const supabase = createClient();
    supabase
      .from("custom_requests")
      .select("*, profiles(full_name, email, phone), brands(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRequests(data || []);
        setLoading(false);
      });
  }, [profile?.is_admin]);

  function toggleRow(req: CustomRequest) {
    if (expandedId === req.id) {
      setExpandedId(null);
    } else {
      setExpandedId(req.id);
      setEditNotes((prev) => ({
        ...prev,
        [req.id]: req.admin_notes || "",
      }));
      setEditStatus((prev) => ({
        ...prev,
        [req.id]: req.status,
      }));
    }
  }

  async function handleUpdate(reqId: string) {
    setSaving((prev) => ({ ...prev, [reqId]: true }));

    const supabase = createClient();
    const { error } = await supabase
      .from("custom_requests")
      .update({
        admin_notes: editNotes[reqId] ?? null,
        status: editStatus[reqId],
      })
      .eq("id", reqId);

    if (!error) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === reqId
            ? { ...r, admin_notes: editNotes[reqId] ?? null, status: editStatus[reqId] }
            : r
        )
      );
    }

    setSaving((prev) => ({ ...prev, [reqId]: false }));
  }

  if (loading) {
    return <LoadingSpinner className="py-20" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl text-cream">
          Custom Requests{" "}
          <span className="text-cream-31 text-sm font-normal">
            ({requests.length})
          </span>
        </h2>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Type
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Client
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Brand
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Description
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Reference
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Budget
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Status
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-cream-31"
                >
                  No custom requests yet.
                </td>
              </tr>
            ) : (
              requests.map((req) => {
                const badge = STATUS_BADGE[req.status] ?? {
                  label: req.status,
                  variant: "default" as BadgeVariant,
                };
                const isExpanded = expandedId === req.id;

                return (
                  <tr
                    key={req.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td colSpan={8} className="p-0">
                      {/* Summary row */}
                      <button
                        type="button"
                        onClick={() => toggleRow(req)}
                        className="w-full text-left hover:bg-surface/50 transition-colors cursor-pointer"
                      >
                        <div className="grid grid-cols-[100px_120px_100px_1fr_100px_100px_100px_90px] items-center px-4 py-3 gap-2">
                          <span className="text-cream-61">
                            {formatRequestType(req.request_type)}
                          </span>
                          <span className="text-cream font-medium truncate">
                            {req.profiles?.full_name || req.profiles?.email || "-"}
                          </span>
                          <span className="text-cream-61 truncate">
                            {req.brands?.name || "-"}
                          </span>
                          <span className="text-cream-61 truncate">
                            {truncate(req.description, 80)}
                          </span>
                          <span>
                            {req.reference_url ? (
                              <a
                                href={req.reference_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View
                              </a>
                            ) : (
                              <span className="text-cream-31">-</span>
                            )}
                          </span>
                          <span className="text-cream-61">
                            {formatBudget(req.budget_range)}
                          </span>
                          <span>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </span>
                          <span className="text-cream-31 text-xs whitespace-nowrap">
                            {formatDate(req.created_at)}
                          </span>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-border bg-background">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                            <div>
                              <h4 className="text-xs uppercase text-cream-31 font-medium mb-2">
                                Full Description
                              </h4>
                              <p className="text-cream-61 text-sm whitespace-pre-wrap">
                                {req.description}
                              </p>

                              {req.reference_url && (
                                <div className="mt-4">
                                  <h4 className="text-xs uppercase text-cream-31 font-medium mb-1">
                                    Reference URL
                                  </h4>
                                  <a
                                    href={req.reference_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent hover:underline text-sm break-all"
                                  >
                                    {req.reference_url}
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-4">
                              <Textarea
                                label="Admin Notes"
                                placeholder="Add internal notes..."
                                value={editNotes[req.id] ?? ""}
                                onChange={(e) =>
                                  setEditNotes((prev) => ({
                                    ...prev,
                                    [req.id]: e.target.value,
                                  }))
                                }
                              />

                              <Select
                                label="Status"
                                options={STATUS_OPTIONS}
                                value={editStatus[req.id] ?? req.status}
                                onChange={(e) =>
                                  setEditStatus((prev) => ({
                                    ...prev,
                                    [req.id]: e.target.value,
                                  }))
                                }
                              />

                              <Button
                                size="sm"
                                loading={saving[req.id] || false}
                                onClick={() => handleUpdate(req.id)}
                              >
                                Update
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
