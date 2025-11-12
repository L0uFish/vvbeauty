"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragHandle from "./DragHandle";
import { Service } from "../types/service";
import { useState, KeyboardEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type InlineProps = {
  value: string;
  placeholder?: string;
  className?: string;
  type?: "text" | "number";
  multiline?: boolean;
  onSave: (newValue: string) => Promise<void> | void;
};

function InlineEditable({
  value,
  placeholder,
  className,
  type = "text",
  multiline = false,
  onSave,
}: InlineProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const startEdit = () => {
    setDraft(value ?? "");
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value ?? "");
  };

  const handleKey = async (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      return;
    }

    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      if (draft !== value) {
        await onSave(draft);
      }
      setEditing(false);
    }
  };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          className={className}
          autoFocus
          rows={2}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={cancel}
        />
      );
    }

    return (
      <input
        className={className}
        autoFocus
        type={type}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={cancel}
      />
    );
  }

  return (
    <span
      className={className}
      onClick={startEdit}
    >
      {value && value !== ""
        ? value
        : placeholder || "—"}
    </span>
  );
}

export default function ServiceItem({
  svc,
  onLocalUpdate
}: {
  svc: Service;
  onLocalUpdate: (id: string, field: keyof Service, value: any) => void;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: svc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function updateField(field: keyof Service, rawValue: any) {
    const payload: any = {};

    if (field === "duration_minutes" || field === "buffer_minutes") {
      payload[field] = rawValue === "" ? null : parseInt(rawValue, 10);
    } else if (field === "promo_price" || field === "price") {
      payload[field] = rawValue === "" ? null : rawValue;
    } else if (field === "description") {
      payload[field] = rawValue === "" ? null : rawValue;
    } else {
      payload[field] = rawValue;
    }

    const { error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", svc.id);

        if (error) {
        alert("Kon dienst niet bijwerken");
        console.error(error);
        return;
        }

        // instant frontend update
        onLocalUpdate(svc.id, field, rawValue);
  }

  async function handleDelete() {
    if (!confirm(`Dienst "${svc.name}" verwijderen?`)) return;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", svc.id);

    if (error) {
      alert("Kon dienst niet verwijderen");
      console.error(error);
      return;
    }

    router.refresh();
  }

  async function toggleActive(checked: boolean) {
    await updateField("active", checked);
  }

  const durationLabel =
    svc.duration_minutes != null ? `${svc.duration_minutes}` : "";
  const bufferLabel =
    svc.buffer_minutes != null ? `${svc.buffer_minutes}` : "";

  return (
    <div
    ref={setNodeRef}
    style={style}
    className={`service-item ${svc.active ? "" : "inactive"}`}
    >
      <div className="service-top-row service-grid">
        <label className="active-toggle">
          <input
            type="checkbox"
            checked={svc.active}
            onChange={(e) => toggleActive(e.target.checked)}
          />
        </label>

        <InlineEditable
          value={svc.name}
          placeholder="Naam"
          className="service-name"
          onSave={(val) => updateField("name", val)}
        />

        <InlineEditable
          value={svc.price}
          placeholder="Prijs"
          type="number"
          className="service-price"
          onSave={(val) => updateField("price", val)}
        />

        <InlineEditable
          value={svc.promo_price ?? ""}
          placeholder="Promo"
          type="number"
          className="service-promo"
          onSave={(val) => updateField("promo_price", val)}
        />

        <InlineEditable
          value={durationLabel}
          placeholder="Duur (min)"
          type="number"
          className="service-duration"
          onSave={(val) => updateField("duration_minutes", val)}
        />

        <InlineEditable
          value={bufferLabel}
          placeholder="Buffer (min)"
          type="number"
          className="service-buffer"
          onSave={(val) => updateField("buffer_minutes", val)}
        />

        <button
          className="service-delete-btn"
          onClick={handleDelete}
        >
        </button>

        <div
          className="drag-handle"
          {...attributes}
          {...listeners}
        >
          <DragHandle />
        </div>
      </div>

      <div className="service-bottom-row">
        <InlineEditable
          value={svc.description || ""}
          placeholder="Beschrijving"
          multiline
          className="service-description"
          onSave={(val) => updateField("description", val)}
        />
      </div>
    </div>
  );
}
