"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import { useRouter } from "next/navigation";

export default function CustomRequestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    request_type: "make_this" as "make_this" | "custom_brief",
    reference_url: "",
    description: "",
    budget_range: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const supabase = createClient();
    await supabase.from("custom_requests").insert({
      user_id: user.id,
      ...form,
    });

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <Card>
          <div className="text-4xl mb-4">&#x2705;</div>
          <h1 className="font-display font-bold text-2xl text-cream mb-2">
            Request submitted!
          </h1>
          <p className="text-cream-61 text-sm mb-6">
            We&apos;ll review your request and get back to you on WhatsApp within 48 hours with a quote.
          </p>
          <Button onClick={() => router.push("/")}>
            Back to recipes
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="font-display font-bold text-2xl text-cream mb-2">
        Request a Custom Video
      </h1>
      <p className="text-cream-61 text-sm mb-8">
        Have something specific in mind? Tell us about it and we&apos;ll send you a quote within 48 hours.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Select
          label="What kind of request?"
          value={form.request_type}
          onChange={(e) => setForm({ ...form, request_type: e.target.value as "make_this" | "custom_brief" })}
          options={[
            { value: "make_this", label: "Make this, but for my brand (paste a video URL)" },
            { value: "custom_brief", label: "Custom creative brief (describe your concept)" },
          ]}
        />

        {form.request_type === "make_this" && (
          <Input
            label="Reference video URL"
            type="url"
            placeholder="https://www.instagram.com/reel/..."
            value={form.reference_url}
            onChange={(e) => setForm({ ...form, reference_url: e.target.value })}
            required
          />
        )}

        <Textarea
          label={form.request_type === "make_this" ? "What do you like about this video?" : "Describe your concept"}
          placeholder={
            form.request_type === "make_this"
              ? "What elements do you want us to replicate? Style, pacing, format, etc."
              : "Describe the video you want. What's the message, audience, and desired outcome?"
          }
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />

        <Select
          label="Budget range"
          value={form.budget_range}
          onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
          options={[
            { value: "", label: "Select a range" },
            { value: "under_200", label: "Under €200" },
            { value: "200_400", label: "€200 - €400" },
            { value: "400_plus", label: "€400+" },
            { value: "not_sure", label: "Not sure yet" },
          ]}
        />

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Submit request
        </Button>
      </form>
    </div>
  );
}
