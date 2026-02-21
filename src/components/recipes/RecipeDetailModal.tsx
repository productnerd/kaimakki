"use client";

import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";

type Recipe = {
  id: string;
  slug: string;
  name: string;
  description: string;
  complexity: string;
  price_cents: number;
  turnaround_days: number;
  max_output_seconds: number;
  intake_form_schema: { fields: { name: string; label: string; type: string; required?: boolean }[] };
  deliverables_description: string[];
};

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
}

export default function RecipeDetailModal({ recipe, onClose }: RecipeDetailModalProps) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  if (!recipe) return null;

  async function handleAddToCart() {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    await addItem(recipe!.id);
    onClose();
  }

  return (
    <Modal isOpen={!!recipe} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant={recipe.complexity === "simple" ? "lime" : "accent"}>
              {recipe.complexity}
            </Badge>
            <span className="text-cream-31 text-sm">
              {recipe.turnaround_days} business days
            </span>
            <span className="text-cream-31 text-sm">
              Max {recipe.max_output_seconds}s
            </span>
          </div>
          <h2 className="font-display font-bold text-2xl text-cream">
            {recipe.name}
          </h2>
        </div>

        {/* Description */}
        <p className="text-cream-61 leading-relaxed">
          {recipe.description}
        </p>

        {/* What you provide */}
        <div>
          <h3 className="font-display font-bold text-sm text-cream-78 uppercase tracking-wider mb-3">
            What you provide
          </h3>
          <ul className="space-y-2">
            {recipe.intake_form_schema.fields.map((field) => (
              <li key={field.name} className="flex items-start gap-2 text-sm text-cream-61">
                <span className="text-accent mt-0.5">&#x2022;</span>
                <span>
                  {field.label}
                  {field.required && <span className="text-accent ml-1">*</span>}
                </span>
              </li>
            ))}
            <li className="flex items-start gap-2 text-sm text-cream-61">
              <span className="text-accent mt-0.5">&#x2022;</span>
              <span>Raw footage (link to Google Drive, Dropbox, etc.)</span>
            </li>
          </ul>
        </div>

        {/* What you get */}
        <div>
          <h3 className="font-display font-bold text-sm text-cream-78 uppercase tracking-wider mb-3">
            What you get
          </h3>
          <ul className="space-y-2">
            {recipe.deliverables_description.map((d) => (
              <li key={d} className="flex items-start gap-2 text-sm text-cream-61">
                <span className="text-lime mt-0.5">&#x2713;</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Additional format */}
        <div className="bg-background/50 rounded-brand p-4 border border-border">
          <p className="text-sm text-cream-61">
            Need an additional format? (e.g., both 9:16 and 16:9) — <strong className="text-cream">+&euro;20</strong> at checkout.
          </p>
        </div>

        {/* Price and CTA */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="font-display font-bold text-3xl text-cream">
              &euro;{(recipe.price_cents / 100).toFixed(0)}
            </span>
            <span className="text-cream-31 text-sm ml-2">per video</span>
          </div>
          <Button size="lg" onClick={handleAddToCart}>
            Add to cart
          </Button>
        </div>
      </div>
    </Modal>
  );
}
