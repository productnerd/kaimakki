"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { getRecipeIcon } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

type IntakeField = {
  name: string;
  type: "text" | "textarea" | "select" | "url" | "number";
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

type IntakeFormSchema = {
  fields: IntakeField[];
};

type BriefOrder = {
  id: string;
  order_number: string;
  status: string;
  recipe_id: string;
  intake_responses: Record<string, unknown> | null;
  video_recipes: { name: string; slug: string; intake_form_schema: Record<string, unknown> | null } | null;
};

interface BriefFormModalProps {
  order: BriefOrder | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function BriefFormModal({ order, onClose, onSaved }: BriefFormModalProps) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [inspirationLinks, setInspirationLinks] = useState("");
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const schema = order?.video_recipes?.intake_form_schema as IntakeFormSchema | null | undefined;
  const fields: IntakeField[] = schema?.fields ?? [];
  const isEditable = order?.status === "needs_brief" || order?.status === "submitted";

  // Populate form from existing intake_responses
  useEffect(() => {
    if (!order) return;
    const r = order.intake_responses ?? {};
    setTitle((r.video_title as string) ?? "");
    setBrief((r.brief as string) ?? "");
    setInspirationLinks((r.inspiration_links as string) ?? "");

    const dynamic: Record<string, string> = {};
    for (const field of fields) {
      dynamic[field.name] = (r[field.name] as string) ?? "";
    }
    setDynamicValues(dynamic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  if (!order) return null;

  function setDynamic(name: string, value: string) {
    setDynamicValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {
    setSaving(true);

    const intake: Record<string, unknown> = {
      video_title: title,
      brief,
      inspiration_links: inspirationLinks,
      ...dynamicValues,
    };

    const supabase = createClient();
    const update: Record<string, unknown> = { intake_responses: intake };

    // Move from needs_brief → submitted when user fills in the brief
    if (order!.status === "needs_brief") {
      update.status = "submitted";
    }

    await supabase.from("orders").update(update).eq("id", order!.id);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal isOpen={!!order} onClose={onClose} title="Fill in Your Brief" size="lg">
      {/* Order header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-lg">{getRecipeIcon(order.video_recipes?.slug)}</span>
        <span className="text-cream font-medium">{order.video_recipes?.name ?? "Custom Order"}</span>
        <span className="text-cream-31 text-sm ml-auto">{order.order_number}</span>
      </div>

      <div className="space-y-5">
        {/* Fixed fields */}
        <Input
          label="Video Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What should we call this video?"
          disabled={!isEditable}
        />

        <Textarea
          label="Brief / Description"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Tell us what you want. The more detail, the better the result."
          disabled={!isEditable}
        />

        <Textarea
          label="Inspiration Links"
          value={inspirationLinks}
          onChange={(e) => setInspirationLinks(e.target.value)}
          placeholder="One link per line. Videos, posts, or anything that captures the vibe."
          rows={3}
          disabled={!isEditable}
        />

        {/* Dynamic fields from recipe intake_form_schema */}
        {fields.length > 0 && (
          <>
            <div className="border-t border-border pt-4">
              <p className="text-cream-61 text-xs uppercase tracking-wider mb-4">Recipe-specific fields</p>
            </div>
            {fields.map((field) => {
              const value = dynamicValues[field.name] ?? "";

              if (field.type === "select" && field.options) {
                return (
                  <Select
                    key={field.name}
                    label={field.label}
                    value={value}
                    onChange={(e) => setDynamic(field.name, e.target.value)}
                    options={[
                      { value: "", label: "Select..." },
                      ...field.options.map((o) => ({ value: o, label: o })),
                    ]}
                    disabled={!isEditable}
                  />
                );
              }

              if (field.type === "textarea") {
                return (
                  <Textarea
                    key={field.name}
                    label={field.label}
                    value={value}
                    onChange={(e) => setDynamic(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={!isEditable}
                  />
                );
              }

              return (
                <Input
                  key={field.name}
                  label={field.label}
                  type={field.type === "url" ? "url" : field.type === "number" ? "number" : "text"}
                  value={value}
                  onChange={(e) => setDynamic(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={!isEditable}
                />
              );
            })}
          </>
        )}

        {/* Submit */}
        {isEditable ? (
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {order.status === "needs_brief" ? "Submit Brief" : "Save Changes"}
            </Button>
          </div>
        ) : (
          <p className="text-cream-31 text-sm text-center pt-2">
            This brief is locked — your order is already in production.
          </p>
        )}
      </div>
    </Modal>
  );
}
