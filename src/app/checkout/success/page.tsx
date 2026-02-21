"use client";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useRouter } from "next/navigation";

export default function CheckoutSuccessPage() {
  const router = useRouter();

  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <Card>
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center text-3xl">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="font-display font-bold text-2xl text-cream">
            Your order has been placed!
          </h1>

          <p className="text-cream-61 text-sm">
            We&apos;ll start working on your videos right away. Track progress
            in your dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
            <Button variant="ghost" onClick={() => router.push("/")}>
              Browse more recipes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
