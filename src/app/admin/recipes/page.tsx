"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getRecipeIcon } from "@/lib/constants";

type Recipe = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  filming_difficulty: string;
  editing_difficulty: string;
  price_cents: number;
  turnaround_days: number;
  base_output_seconds: number;
  intake_form_schema: Record<string, unknown> | null;
  deliverables_description: string[] | null;
  example_thumbnail_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  example_video_url: string | null;
  icon: string | null;
  min_tier_videos: number;
  tag: string | null;
  extras_schema: Record<string, unknown> | null;
  recipe_type: string;
  creative_surcharge_percent: number;
  example_urls: string[] | null;
};

export default function AdminRecipesPage() {
  const { profile } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    if (!profile?.is_admin) return;
    const supabase = createClient();
    supabase
      .from("video_recipes")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setRecipes((data as Recipe[]) || []);
        setLoading(false);
      });
  }, [profile]);

  if (loading) {
    return <LoadingSpinner className="py-20" />;
  }

  const filtered = showInactive ? recipes : recipes.filter((r) => r.is_active);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-cream-61 text-sm">
          {filtered.length} recipe{filtered.length !== 1 ? "s" : ""}
          {!showInactive && recipes.length !== filtered.length && (
            <span className="text-cream-31"> ({recipes.length - filtered.length} inactive hidden)</span>
          )}
        </p>
        <label className="flex items-center gap-2 text-sm text-cream-61 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-accent"
          />
          Show inactive
        </label>
      </div>

      <div className="space-y-3">
        {filtered.map((r) => {
          const isExpanded = expanded === r.id;
          const intakeFields = (r.intake_form_schema as { fields?: { name: string; label: string; type: string; required?: boolean; mode?: string; weHandleLabel?: string }[] } | null)?.fields ?? [];

          return (
            <div
              key={r.id}
              className={`rounded-brand border transition-colors ${
                r.is_active ? "border-border bg-surface" : "border-border/50 bg-surface/50 opacity-60"
              }`}
            >
              {/* Summary row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : r.id)}
                className="w-full text-left px-5 py-4 flex items-center gap-4"
              >
                <span className="text-xl flex-shrink-0">{getRecipeIcon(r.slug)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-cream">{r.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">🎬 {r.filming_difficulty}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">✂️ {r.editing_difficulty}</span>
                    {r.tag && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lime/10 text-lime">{r.tag}</span>
                    )}
                    {r.recipe_type === "session" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400">session</span>
                    )}
                    {!r.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-cream-31 mt-0.5">{r.slug}</p>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0 text-sm">
                  <span className="text-cream font-medium">&euro;{(r.price_cents / 100).toFixed(0)}</span>
                  <span className="text-cream-31">{r.base_output_seconds}s</span>
                  <span className="text-cream-31">{r.turnaround_days}d</span>
                  <span className="text-cream-31">tier {r.min_tier_videos}</span>
                  <span className="text-cream-31 text-xs">{isExpanded ? "▾" : "▸"}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-border/50 pt-4 space-y-4">
                  {/* Core fields */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="ID" value={r.id} mono />
                    <Field label="Price" value={`€${(r.price_cents / 100).toFixed(0)} (${r.price_cents}c)`} />
                    <Field label="Creative surcharge" value={`${r.creative_surcharge_percent}%`} />
                    <Field label="Filming difficulty" value={r.filming_difficulty} />
                    <Field label="Editing difficulty" value={r.editing_difficulty} />
                    <Field label="Base duration" value={`${r.base_output_seconds}s`} />
                    <Field label="Turnaround" value={`${r.turnaround_days} days`} />
                    <Field label="Min tier videos" value={String(r.min_tier_videos)} />
                    <Field label="Sort order" value={String(r.sort_order)} />
                    <Field label="Type" value={r.recipe_type} />
                    <Field label="Tag" value={r.tag ?? "-"} />
                    <Field label="Active" value={r.is_active ? "Yes" : "No"} />
                    <Field label="Created" value={new Date(r.created_at).toLocaleDateString()} />
                  </div>

                  {/* Description */}
                  {r.description && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-cream-31 mb-1">Description</p>
                      <p className="text-sm text-cream-61 bg-background/50 rounded-brand p-3 border border-border/50">
                        {r.description}
                      </p>
                    </div>
                  )}

                  {/* Deliverables */}
                  {r.deliverables_description && r.deliverables_description.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-cream-31 mb-1">Deliverables</p>
                      <ul className="space-y-1">
                        {r.deliverables_description.map((d, i) => (
                          <li key={i} className="text-sm text-cream-61 flex items-start gap-2">
                            <span className="text-accent mt-0.5">→</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Intake form fields */}
                  {intakeFields.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-cream-31 mb-1">
                        Intake form fields ({intakeFields.length})
                      </p>
                      <div className="overflow-x-auto rounded-brand border border-border/50">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/50 bg-background/30">
                              <th className="text-left px-3 py-2 text-[10px] uppercase text-cream-31">Name</th>
                              <th className="text-left px-3 py-2 text-[10px] uppercase text-cream-31">Label</th>
                              <th className="text-left px-3 py-2 text-[10px] uppercase text-cream-31">Type</th>
                              <th className="text-left px-3 py-2 text-[10px] uppercase text-cream-31">Required</th>
                              <th className="text-left px-3 py-2 text-[10px] uppercase text-cream-31">Mode</th>
                              <th className="text-left px-3 py-2 text-[10px] uppercase text-cream-31">We Handle</th>
                            </tr>
                          </thead>
                          <tbody>
                            {intakeFields.map((f, i) => (
                              <tr key={i} className="border-b border-border/30 last:border-b-0">
                                <td className="px-3 py-1.5 text-cream font-mono text-xs">{f.name}</td>
                                <td className="px-3 py-1.5 text-cream-61">{f.label}</td>
                                <td className="px-3 py-1.5 text-cream-31">{f.type}</td>
                                <td className="px-3 py-1.5 text-cream-31">{f.required ? "yes" : "no"}</td>
                                <td className="px-3 py-1.5 text-cream-31">{f.mode ?? "both"}</td>
                                <td className="px-3 py-1.5 text-cream-31">{f.weHandleLabel ?? "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Extras schema */}
                  {r.extras_schema && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-cream-31 mb-1">Extras schema</p>
                      <pre className="text-xs text-cream-61 bg-background/50 rounded-brand p-3 border border-border/50 overflow-x-auto">
                        {JSON.stringify(r.extras_schema, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* URLs */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Thumbnail URL" value={r.example_thumbnail_url ?? "-"} mono />
                    <Field label="Video URL" value={r.example_video_url ?? "-"} mono />
                  </div>

                  {/* Example URLs */}
                  {r.example_urls && r.example_urls.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-cream-31 mb-1">
                        Example URLs ({r.example_urls.length})
                      </p>
                      <ul className="space-y-1">
                        {r.example_urls.map((url, i) => (
                          <li key={i} className="text-xs text-cream-61 font-mono break-all">
                            <span className="text-cream-31 mr-1">{i + 1}.</span>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">{url}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-cream-31 mb-0.5">{label}</p>
      <p className={`text-sm text-cream-61 ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</p>
    </div>
  );
}
