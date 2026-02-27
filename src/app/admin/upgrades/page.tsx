"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { type Milestone } from "@/lib/unlocks";

type TierRequest = {
  id: string;
  brand_id: string;
  user_id: string;
  video_link: string;
  target_milestone_id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  brands: { name: string; brand_volume: { approved_video_count: number; lifetime_video_count: number; current_discount_percent: number }[] | { approved_video_count: number; lifetime_video_count: number; current_discount_percent: number } | null } | null;
  profiles: { full_name: string | null; email: string } | null;
};

type BadgeVariant = "default" | "accent" | "lime" | "pink" | "warning" | "success";

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "default" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminTierUpgradesPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<TierRequest[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  function fetchRequests() {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("tier_upgrade_requests")
        .select("*, brands(name, brand_volume(*)), profiles(full_name, email)")
        .order("created_at", { ascending: false }),
      supabase
        .from("unlock_milestones")
        .select("*")
        .order("min_videos"),
    ]).then(([reqRes, msRes]) => {
      setRequests((reqRes.data as TierRequest[]) || []);
      setMilestones((msRes.data ?? []) as Milestone[]);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!profile?.is_admin) return;
    fetchRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function getMilestoneName(id: string): string {
    const ms = milestones.find((m) => m.id === id);
    return ms ? ms.tier_name : "Unknown";
  }

  function getMilestone(id: string): Milestone | undefined {
    return milestones.find((m) => m.id === id);
  }

  function getCurrentTierName(request: TierRequest): string {
    const vol = Array.isArray(request.brands?.brand_volume)
      ? request.brands.brand_volume[0]
      : request.brands?.brand_volume;
    const approvedCount = vol?.approved_video_count ?? 0;
    const sorted = [...milestones].sort((a, b) => a.min_videos - b.min_videos);
    let tier = "New";
    for (const ms of sorted) {
      if (approvedCount >= ms.min_videos) tier = ms.tier_name;
    }
    return tier;
  }

  async function handleApprove(request: TierRequest) {
    const targetMs = getMilestone(request.target_milestone_id);
    if (!targetMs) return;

    setProcessingId(request.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Update request status
    await supabase
      .from("tier_upgrade_requests")
      .update({
        status: "approved",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    // 2. Update brand_volume
    await supabase
      .from("brand_volume")
      .update({
        approved_video_count: targetMs.min_videos,
        current_discount_percent: targetMs.discount_percent,
      })
      .eq("brand_id", request.brand_id);

    setProcessingId(null);
    fetchRequests();
  }

  async function handleReject(request: TierRequest) {
    setProcessingId(request.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("tier_upgrade_requests")
      .update({
        status: "rejected",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    setProcessingId(null);
    fetchRequests();
  }

  if (loading) {
    return <LoadingSpinner className="py-20" />;
  }

  const filtered = requests.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter
  );

  return (
    <div>
      {/* Filter */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-brand bg-surface border border-border text-cream text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors duration-150"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-brand border border-border">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">Client</th>
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">Brand</th>
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">Current Tier</th>
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">Target Tier</th>
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">Proof</th>
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">Submitted</th>
              <th className="text-left text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-right text-xs font-medium text-cream-31 uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-cream-31 text-sm">
                  No tier upgrade requests
                </td>
              </tr>
            ) : (
              filtered.map((req) => {
                const badge = STATUS_BADGE[req.status] ?? { label: req.status, variant: "default" as BadgeVariant };
                const isProcessing = processingId === req.id;

                return (
                  <tr key={req.id} className="border-b border-border last:border-b-0 hover:bg-background/50 transition-colors duration-150">
                    <td className="px-4 py-3 text-sm text-cream">
                      {req.profiles?.full_name ?? req.profiles?.email ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm text-cream">
                      {req.brands?.name ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm text-cream-61">
                      {getCurrentTierName(req)}
                    </td>
                    <td className="px-4 py-3 text-sm text-cream font-medium">
                      {getMilestoneName(req.target_milestone_id)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <a
                        href={req.video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline truncate block max-w-[200px]"
                      >
                        {req.video_link}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-cream-61">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(req)}
                            className="px-3 py-1.5 rounded-brand bg-lime/20 text-lime text-xs font-medium hover:bg-lime/30 disabled:opacity-50 transition-colors"
                          >
                            {isProcessing ? "..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleReject(req)}
                            className="px-3 py-1.5 rounded-brand bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
