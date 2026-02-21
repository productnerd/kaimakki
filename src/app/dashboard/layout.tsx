"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Badge from "@/components/ui/Badge";
import type { ReactNode } from "react";

const tabs = [
  { label: "Orders", href: "/dashboard" },
  { label: "Brand", href: "/dashboard/brand" },
  { label: "Settings", href: "/dashboard/settings" },
] as const;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
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

        <span className="pb-3 text-sm font-medium text-cream-31 flex items-center gap-2 cursor-default">
          Content Strategy Pack
          <Badge>Coming Soon</Badge>
        </span>
      </nav>

      {children}
    </div>
  );
}
