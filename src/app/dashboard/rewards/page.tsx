"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import RewardsTracker from "@/components/rewards/RewardsTracker";

type BrandVolume = {
  lifetime_video_count: number;
  approved_video_count: number;
  lifetime_spent_cents: number;
  current_discount_percent: number;
};

export default function RewardsPage() {
  const { user } = useAuth();
  const [volume, setVolume] = useState<BrandVolume | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchData() {
      const { data: brandData } = await supabase
        .from("brands")
        .select("id, brand_volume(*)")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();

      const vol = Array.isArray(brandData?.brand_volume)
        ? brandData.brand_volume[0]
        : brandData?.brand_volume;
      setVolume(vol ?? null);
      setBrandId(brandData?.id ?? null);

      if (brandData?.id) {
        const { data: pendingReq } = await supabase
          .from("tier_upgrade_requests")
          .select("id")
          .eq("brand_id", brandData.id)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();

        setHasPendingRequest(!!pendingReq);
      }

      setLoading(false);
    }

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <RewardsTracker
        lifetimeVideoCount={volume?.lifetime_video_count ?? 0}
        approvedVideoCount={volume?.approved_video_count ?? 0}
        currentDiscountPercent={volume?.current_discount_percent ?? 0}
        lifetimeSpentCents={volume?.lifetime_spent_cents ?? 0}
        mode="dashboard"
        brandId={brandId ?? undefined}
        pendingUpgradeRequest={hasPendingRequest}
      />
    </div>
  );
}
