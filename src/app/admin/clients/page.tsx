"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Badge from "@/components/ui/Badge";

type ClientProfile = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  is_admin: boolean;
  created_at: string;
  brands: Array<{
    name: string;
    brand_volume: Array<{
      current_discount_percent: number;
      lifetime_video_count: number;
    }> | {
      current_discount_percent: number;
      lifetime_video_count: number;
    } | null;
  }> | null;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stripNonDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export default function AdminClientsPage() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile?.is_admin) return;

    const supabase = createClient();

    Promise.all([
      supabase
        .from("profiles")
        .select(
          "*, brands(name, brand_volume(current_discount_percent, lifetime_video_count))"
        )
        .order("created_at", { ascending: false }),
      supabase.from("orders").select("user_id"),
    ]).then(([profilesRes, ordersRes]) => {
      setProfiles(profilesRes.data || []);

      const counts: Record<string, number> = {};
      (ordersRes.data || []).forEach((o: { user_id: string }) => {
        counts[o.user_id] = (counts[o.user_id] || 0) + 1;
      });
      setOrderCounts(counts);
      setLoading(false);
    });
  }, [profile?.is_admin]);

  if (loading) {
    return <LoadingSpinner className="py-20" />;
  }

  const query = search.toLowerCase();
  const filtered = profiles.filter((p) => {
    if (!query) return true;
    const name = (p.full_name || "").toLowerCase();
    const email = p.email.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl text-cream">
          Clients{" "}
          <span className="text-cream-31 text-sm font-normal">
            ({profiles.length})
          </span>
        </h2>
      </div>

      <div className="mb-6 max-w-sm">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Name
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Email
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Phone
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Brand
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Orders
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Volume Tier
              </th>
              <th className="text-left text-cream-31 text-xs uppercase tracking-wider px-4 py-3 font-medium">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-cream-31"
                >
                  {search ? "No clients match your search." : "No clients found."}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const brand = Array.isArray(p.brands)
                  ? p.brands[0]
                  : p.brands;
                const brandVolume = brand
                  ? Array.isArray(brand.brand_volume)
                    ? brand.brand_volume[0]
                    : brand.brand_volume
                  : null;
                const discount = brandVolume?.current_discount_percent ?? 0;
                const count = orderCounts[p.id] || 0;

                return (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-b-0 hover:bg-surface/50"
                  >
                    <td className="px-4 py-3 text-cream font-medium whitespace-nowrap">
                      {p.full_name || "-"}
                      {p.is_admin && (
                        <Badge variant="accent" className="ml-2">
                          Admin
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cream-61">{p.email}</td>
                    <td className="px-4 py-3 text-cream-61 whitespace-nowrap">
                      {p.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          {p.phone}
                          <a
                            href={`https://wa.me/${stripNonDigits(p.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300 transition-colors"
                            title="Open WhatsApp"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          </a>
                        </span>
                      ) : (
                        <span className="text-cream-31">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cream-61">
                      {brand?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-cream-61">{count}</td>
                    <td className="px-4 py-3">
                      {discount > 0 ? (
                        <Badge variant="lime">{discount}%</Badge>
                      ) : (
                        <span className="text-cream-31">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cream-31 whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
