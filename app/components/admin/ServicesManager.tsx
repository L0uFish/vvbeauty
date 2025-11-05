"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import ServiceAddModal from "./ServiceAddModal";
import "../../styles/ServicesManager.css";

/* === TYPE DEFINITIONS === */
type Service = {
  id: string;
  name: string;
  category: string;
  category_order: number;
  price: number | null;
  promo_price: number | null;
  duration_minutes: number | null;
  buffer_minutes: number | null;
  description: string | null;
  display_order: number;
  active: boolean;
};

/* === MAIN COMPONENT === */
export default function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<{ id: string; field: keyof Service } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  /* --- Fetch services --- */
  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("category_order", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) console.error("Error fetching services:", error);
    else setServices((data || []) as Service[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  /* --- Helpers --- */
  const groupByCategory = (list: Service[]) =>
    list.reduce((acc: Record<string, Service[]>, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    }, {});

  const grouped = groupByCategory(services);
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) =>
      (grouped[a][0]?.category_order ?? 0) - (grouped[b][0]?.category_order ?? 0)
  );

  /* --- Drag & Drop --- */
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    // CATEGORY REORDER
    if (type === "CATEGORY") {
      const reorderedCats = Array.from(sortedCategories);
      const [movedCat] = reorderedCats.splice(source.index, 1);
      reorderedCats.splice(destination.index, 0, movedCat);

      // Update all services' category_order
      const updates: Promise<any>[] = [];
      reorderedCats.forEach((cat, idx) => {
        const catServices = grouped[cat];
        for (const s of catServices) {
          updates.push(
            (async () =>
                await supabase
                .from("services")
                .update({ category_order: idx })
                .eq("id", s.id))()
            );

        }
      });
      await Promise.all(updates);
      fetchServices();
      return;
    }

    // SERVICE REORDER
    const sourceCat = source.droppableId;
    const destCat = destination.droppableId;
    if (sourceCat !== destCat) return;

    const categoryServices = Array.from(grouped[sourceCat]);
    const [moved] = categoryServices.splice(source.index, 1);
    categoryServices.splice(destination.index, 0, moved);

    const updatedCategory = categoryServices.map((s, i) => ({
      ...s,
      display_order: i + 1,
    }));

    for (const s of updatedCategory) {
      await supabase
        .from("services")
        .update({ display_order: s.display_order })
        .eq("id", s.id);
    }

    fetchServices();
  };

  /* --- Edit Handling --- */
  const startEdit = <K extends keyof Service>(
    id: string,
    field: K,
    value: Service[K]
  ) => {
    setEditing({ id, field });
    setEditValue(String(value ?? ""));
  };

  const commitEdit = async () => {
    if (!editing) return;
    const { id, field } = editing;
    const { error } = await supabase
      .from("services")
      .update({ [field]: editValue })
      .eq("id", id);
    if (error) console.error("Error updating:", error);
    setEditing(null);
    setEditValue("");
    fetchServices();
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue("");
  };

  /* --- Delete Service --- */
  const handleDelete = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze service wilt verwijderen?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) console.error("Error deleting:", error);
    else fetchServices();
  };

  /* --- Toggle Active --- */
  const toggleActive = async (service: Service) => {
    const newValue = !service.active;
    const { error } = await supabase
      .from("services")
      .update({ active: newValue })
      .eq("id", service.id);
    if (error) console.error("Error updating active:", error);
    else fetchServices();
  };

  /* --- UI --- */
  if (loading) return <p>Bezig met laden...</p>;

  return (
    <div className="services-manager">
      <div className="header-bar">
        <h2>Dienstenbeheer</h2>
        <button onClick={() => setShowAddModal(true)} className="add-btn">
          + Nieuwe service
        </button>
      </div>

      <ServiceAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={fetchServices}
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories" type="CATEGORY">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {sortedCategories.map((category, catIndex) => (
                <Draggable
                  key={category}
                  draggableId={`cat-${category}`}
                  index={catIndex}
                >
                  {(providedCat) => (
                    <div
                      ref={providedCat.innerRef}
                      {...providedCat.draggableProps}
                      className="category-section"
                    >
                      <h3
                        className="category-title"
                        {...providedCat.dragHandleProps}
                      >
                        — {category}
                      </h3>

                      <Droppable droppableId={category} type="SERVICE">
                        {(provided) => (
                          <table
                            className="services-table"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            <thead>
                              <tr>
                                <th>Actief</th>
                                <th>Naam</th>
                                <th>Prijs</th>
                                <th>Promo</th>
                                <th>Duur</th>
                                <th>Buffer</th>
                                <th>Beschrijving</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {grouped[category].map(
                                (service: Service, index: number) => (
                                  <Draggable
                                    key={service.id}
                                    draggableId={service.id}
                                    index={index}
                                  >
                                    {(provided, snapshot) => (
                                      <tr
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`service-row ${
                                          snapshot.isDragging ? "dragging" : ""
                                        }`}
                                      >
                                        <td onClick={() => toggleActive(service)}>
                                          {service.active ? "✅" : "❌"}
                                        </td>

                                        {(
                                          [
                                            "name",
                                            "price",
                                            "promo_price",
                                            "duration_minutes",
                                            "buffer_minutes",
                                            "description",
                                          ] as (keyof Service)[]
                                        ).map((field) => (
                                          <td
                                            key={field}
                                            onDoubleClick={() =>
                                              startEdit(
                                                service.id,
                                                field,
                                                service[field]
                                              )
                                            }
                                          >
                                            {editing?.id === service.id &&
                                            editing?.field === field ? (
                                              <input
                                                type={
                                                  [
                                                    "price",
                                                    "promo_price",
                                                    "duration_minutes",
                                                    "buffer_minutes",
                                                  ].includes(field)
                                                    ? "number"
                                                    : "text"
                                                }
                                                value={editValue ?? ""}
                                                onChange={(e) =>
                                                  setEditValue(e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter")
                                                    commitEdit();
                                                  if (e.key === "Escape")
                                                    cancelEdit();
                                                }}
                                                onBlur={cancelEdit}
                                                autoFocus
                                              />
                                            ) : (
                                              service[field] || "-"
                                            )}
                                          </td>
                                        ))}

                                        <td className="actions">
                                          <button
                                            onClick={() =>
                                              handleDelete(service.id)
                                            }
                                            className="delete-btn"
                                          >
                                            ×
                                          </button>
                                          <span
                                            {...provided.dragHandleProps}
                                            className="drag-handle"
                                            title="Versleep om volgorde te wijzigen"
                                          >
                                            ⋮⋮
                                          </span>
                                        </td>
                                      </tr>
                                    )}
                                  </Draggable>
                                )
                              )}
                              {provided.placeholder}
                            </tbody>
                          </table>
                        )}
                      </Droppable>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
