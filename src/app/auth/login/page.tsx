"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Only allow sign-in for existing accounts
    const { data: exists } = await supabase.rpc("check_account_exists", {
      lookup_email: email,
    });

    if (!exists) {
      setLoading(false);
      setError("No account found for this email. Place an order first to create your account.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <Card className="max-w-md w-full text-center">
          <div className="text-4xl mb-4">&#x2709;</div>
          <h1 className="font-display font-bold text-2xl text-cream mb-2">
            Check your email
          </h1>
          <p className="text-cream-61 text-sm mb-6">
            We sent a magic link to <strong className="text-cream">{email}</strong>.
            Click the link in the email to sign in.
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-sm text-accent hover:underline"
          >
            Use a different email
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <Card className="max-w-md w-full">
        <h1 className="font-display font-bold text-2xl text-cream mb-1">
          Sign in
        </h1>
        <p className="text-cream-61 text-sm mb-6">
          Enter your email - we&apos;ll send a magic link
        </p>

        <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={error}
          />

          <Button type="submit" loading={loading} className="w-full">
            Send magic link
          </Button>
        </form>

      </Card>
    </div>
  );
}
