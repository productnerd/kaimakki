"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
            Click the link to create your account.
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
          Get started
        </h1>
        <p className="text-cream-61 text-sm mb-6">
          Create your Kaimakki Studio account
        </p>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
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

        <p className="text-sm text-cream-31 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
