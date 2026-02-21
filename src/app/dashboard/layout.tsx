"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, type ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [hasOrders, setHasOrders] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        setHasOrders((count ?? 0) > 0);
        setChecked(true);
      });
  }, [user]);

  const tabs = [
    ...(hasOrders ? [{ label: "Orders", href: "/dashboard" }] : []),
    { label: "Buy Videos", href: "/dashboard/buy" },
    { label: "Brand Assets", href: "/dashboard/brand" },
    { label: "Rewards", href: "/dashboard/rewards" },
    { label: "Settings", href: "/dashboard/settings" },
  ];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  if (!checked) return null;

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
