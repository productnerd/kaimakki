"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let done = false;

    async function redirectUser(userId: string) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", userId)
        .single();

      // Use window.location for a hard redirect - more reliable than router.push
      window.location.href = profile?.onboarding_complete
        ? "/dashboard"
        : "/onboarding";
    }

    // Listen for auth state changes - fires after the Supabase client
    // finishes processing URL hash tokens (implicit flow).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (done) return;

        if (session?.user) {
          done = true;
          await redirectUser(session.user.id);
        } else if (event === "INITIAL_SESSION") {
          // No session after initialization - auth failed
          done = true;
          window.location.href = "/auth/login";
        }
      }
    );

    // Hard fallback: if nothing happens within 5 seconds, go to login
    const timeout = setTimeout(() => {
      if (done) return;
      done = true;
      window.location.href = "/auth/login";
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner className="mb-4" />
        <p className="text-cream-61 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
