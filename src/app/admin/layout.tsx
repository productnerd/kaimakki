"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { ReactNode } from "react";

const tabs = [
  { label: "Orders", href: "/admin" },
  { label: "Clients", href: "/admin/clients" },
  { label: "Custom Requests", href: "/admin/requests" },
  { label: "Tier Upgrades", href: "/admin/upgrades" },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner className="py-20" />;
  }

  if (!profile?.is_admin) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-cream-31 text-center">Access denied</p>
      </div>
    );
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl text-cream mb-6">Admin Panel</h1>

      <nav className="flex items-center gap-6 border-b border-border mb-8">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`
              pb-3 text-sm font-medium transition-colors duration-150
              ${
                isActive(tab.href)
                  ? "text-cream border-b-2 border-accent"
                  : "text-cream-31 hover:text-cream-61"
              }
            `}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
