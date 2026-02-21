"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useCart } from "@/providers/CartProvider";
import Button from "@/components/ui/Button";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const { user, profile, signOut, loading } = useAuth();
  const { itemCount, toggleCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isOnboarding = pathname === "/onboarding";

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="font-display font-bold text-xl tracking-tight">
            <span className="text-cream">KAIMAKKI</span>
            <span className="text-accent">.</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {isOnboarding ? (
            <button
              onClick={signOut}
              className="text-xs uppercase tracking-wider text-cream-31 hover:text-cream transition-colors"
            >
              SIGN OUT
            </button>
          ) : !loading && user ? (
            <div className="flex items-center gap-4">
              {/* Cart button */}
              <button
                onClick={toggleCart}
                className="relative text-cream-78 hover:text-cream transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-accent text-cream text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
              {profile?.is_admin && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="uppercase tracking-wider text-xs">
                    ADMIN
                  </Button>
                </Link>
              )}
              <button
                onClick={signOut}
                className="text-xs uppercase tracking-wider text-cream-31 hover:text-cream transition-colors"
              >
                SIGN OUT
              </button>
            </div>
          ) : !loading ? (
            <>
              <Link
                href="/"
                className="text-xs uppercase tracking-wider text-cream-78 hover:text-cream transition-colors"
              >
                RECIPES
              </Link>
              <Link
                href="/pricing"
                className="text-xs uppercase tracking-wider text-cream-78 hover:text-cream transition-colors"
              >
                PRICING
              </Link>
              <Link href="/auth/login">
                <Button size="sm" className="uppercase tracking-wider text-xs">SIGN IN</Button>
              </Link>
            </>
          ) : null}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-cream"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-surface border-b border-border px-6 py-4 flex flex-col gap-3">
          {isOnboarding ? (
            <button onClick={signOut} className="text-xs uppercase tracking-wider text-cream-31 text-left">
              SIGN OUT
            </button>
          ) : user ? (
            <>
              {profile?.is_admin && (
                <Link href="/admin" className="text-xs uppercase tracking-wider text-cream-78" onClick={() => setMobileOpen(false)}>
                  ADMIN
                </Link>
              )}
              <button onClick={signOut} className="text-xs uppercase tracking-wider text-cream-31 text-left">
                SIGN OUT
              </button>
            </>
          ) : (
            <>
              <Link href="/" className="text-xs uppercase tracking-wider text-cream-78" onClick={() => setMobileOpen(false)}>
                RECIPES
              </Link>
              <Link href="/pricing" className="text-xs uppercase tracking-wider text-cream-78" onClick={() => setMobileOpen(false)}>
                PRICING
              </Link>
              <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full uppercase tracking-wider text-xs">SIGN IN</Button>
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
