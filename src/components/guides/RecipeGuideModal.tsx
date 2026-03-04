"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";

type GuideSection = {
  title: string;
  icon: string;
  content: string;
  tips?: string[];
};

type Guide = {
  id: string;
  guide_level: string;
  title: string;
  sections: GuideSection[];
};

const LEVEL_CONFIG = {
  basic: { label: "Basic", minVideos: 0, description: "Fundamentals for getting started" },
  intermediate: { label: "Intermediate", minVideos: 8, description: "Level up your production" },
  advanced: { label: "Advanced", minVideos: 20, description: "Master-level techniques" },
} as const;

type GuideLevel = keyof typeof LEVEL_CONFIG;

interface RecipeGuideModalProps {
  recipeId: string;
  recipeName: string;
  isOpen: boolean;
  onClose: () => void;
  approvedVideoCount?: number;
}

export default function RecipeGuideModal({
  recipeId,
  recipeName,
  isOpen,
  onClose,
  approvedVideoCount = 0,
}: RecipeGuideModalProps) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [activeLevel, setActiveLevel] = useState<GuideLevel>("basic");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !recipeId) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("recipe_guides")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("guide_level")
      .then(({ data }) => {
        setGuides((data ?? []) as Guide[]);
        setLoading(false);
      });
  }, [isOpen, recipeId]);

  const activeGuide = guides.find((g) => g.guide_level === activeLevel);

  function isLevelUnlocked(level: GuideLevel): boolean {
    return approvedVideoCount >= LEVEL_CONFIG[level].minVideos;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="font-display font-bold text-2xl text-cream mb-1">
            📖 {recipeName} Guide
          </h2>
          <p className="text-sm text-cream-31">
            Everything you need to film, prepare, and ship great content.
          </p>
        </div>

        {/* Level tabs */}
        <div className="flex gap-2">
          {(Object.keys(LEVEL_CONFIG) as GuideLevel[]).map((level) => {
            const config = LEVEL_CONFIG[level];
            const unlocked = isLevelUnlocked(level);
            const isActive = activeLevel === level;

            return (
              <button
                key={level}
                onClick={() => unlocked && setActiveLevel(level)}
                disabled={!unlocked}
                className={`
                  flex-1 p-3 rounded-brand border transition-colors text-left
                  ${isActive && unlocked
                    ? "border-accent/50 bg-accent/5"
                    : unlocked
                      ? "border-border bg-background/50 hover:border-border/80"
                      : "border-border/30 bg-background/30 opacity-50 cursor-not-allowed"
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-medium ${isActive ? "text-cream" : unlocked ? "text-cream-61" : "text-cream-31"}`}>
                    {config.label}
                  </span>
                  {!unlocked && (
                    <span className="text-[9px] text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                      🔒 {config.minVideos} videos
                    </span>
                  )}
                </div>
                <p className="text-xs text-cream-31">{config.description}</p>
              </button>
            );
          })}
        </div>

        {/* Guide content */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-cream-31 text-sm">Loading guide...</p>
          </div>
        ) : activeGuide ? (
          <div className="space-y-6">
            <h3 className="font-display font-bold text-lg text-cream">
              {activeGuide.title}
            </h3>
            {activeGuide.sections.map((section, i) => (
              <div key={i} className="bg-background/50 rounded-brand p-5 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{section.icon}</span>
                  <h4 className="font-display font-bold text-cream">{section.title}</h4>
                </div>
                <p className="text-cream-61 text-sm leading-relaxed mb-3">
                  {section.content}
                </p>
                {section.tips && section.tips.length > 0 && (
                  <div className="bg-surface/50 rounded-brand p-3 border border-border/50">
                    <p className="text-[9px] uppercase tracking-widest text-lime/70 font-medium mb-2">Pro Tips</p>
                    <ul className="space-y-1.5">
                      {section.tips.map((tip, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-cream-61">
                          <span className="text-lime mt-0.5">→</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-cream-31 text-sm">No guide available for this level yet.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
