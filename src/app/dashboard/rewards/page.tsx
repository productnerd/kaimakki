"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import RewardsTracker from "@/components/rewards/RewardsTracker";

type BrandVolume = {
  lifetime_video_count: number;
  lifetime_spent_cents: number;
  lifetime_saved_cents: number;
  current_discount_percent: number;
};

export default function RewardsPage() {
  const { user } = useAuth();
  const [volume, setVolume] = useState<BrandVolume | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("brands")
      .select("brand_volume(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const vol = Array.isArray(data?.brand_volume)
          ? data.brand_volume[0]
          : data?.brand_volume;
        setVolume(vol ?? null);
        setLoading(false);
      });
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
        currentDiscountPercent={volume?.current_discount_percent ?? 0}
        lifetimeSpentCents={volume?.lifetime_spent_cents ?? 0}
        lifetimeSavedCents={volume?.lifetime_saved_cents ?? 0}
        mode="dashboard"
      />
    </div>
  );
}
