"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragHandle from "./DragHandle";
import { useState, KeyboardEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  collapsed?: boolean;
  servicesCount: number;
  onToggle: () => void;
};

export default function CategoryItem({
  id,
  collapsed,
  servicesCount,
  onToggle,
}: Props) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(id);

  const startEdit = () => {
    setDraft(id);
    setIsEditing(true);
  };

  const handleKey = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsEditing(false);
      setDraft(id);
      return;
    }

    if (e.key === "Enter") {
      const trimmed = draft.trim();
      if (!trimmed || trimmed === id) {
        setIsEditing(false);
        return;
      }

      const { error } = await supabase
        .from("services")
        .update({ category: trimmed })
        .eq("category", id);

      if (error) {
        alert("Kon categorie niet hernoemen");
        console.error(error);
        return;
      }

      setIsEditing(false);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Categorie "${id}" verwijderen?`)) return;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("category", id);

    if (error) {
      alert("Kon categorie niet verwijderen");
      console.error(error);
      return;
    }

    router.refresh();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="category-header"
    >
      <button className="collapse-btn" onClick={onToggle}>
        {collapsed ? "▶" : "▼"}
      </button>

      <div className="category-title-wrapper">
        {isEditing ? (
          <input
            className="category-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={() => {
              setIsEditing(false);
              setDraft(id);
            }}
          />
        ) : (
          <h3 onClick={startEdit} className="category-title-text">
            {id}
          </h3>
        )}

        {servicesCount === 0 && !isEditing && (
          <button
            className="category-delete-btn"
            onClick={handleDelete}
          >
          </button>
        )}
      </div>

      <div className="drag-handle" {...attributes} {...listeners}>
        <DragHandle />
      </div>
    </div>
  );
}
