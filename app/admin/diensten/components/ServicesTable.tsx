"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import CategoryItem from "./CategoryItem";
import ServiceItem from "./ServiceItem";
import { Service } from "../types/service";

interface Props {
  initialServices: Service[];
}

export default function ServicesTable({ initialServices }: Props) {
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [services, setServices] = useState<Service[]>(initialServices);

  // Local update for inline editing (instant feedback)
  function updateLocal(id: string, field: keyof Service, value: any) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // ---------------------------
  // GROUP BY CATEGORY
  // ---------------------------
  const categories = Array.from(new Set(services.map((s) => s.category))).sort(
    (a, b) => {
      const oa = services.find((s) => s.category === a)?.category_order ?? 0;
      const ob = services.find((s) => s.category === b)?.category_order ?? 0;
      return oa - ob;
    }
  );

  const grouped = categories.map((cat) => ({
    category: cat,
    services: [...services]
      .filter((s) => s.category === cat)
      .sort((a, b) => a.display_order - b.display_order),
  }));

  // ---------------------------
  // CATEGORY DRAG END
  // ---------------------------
  const handleCategoryDrag = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.indexOf(active.id as string);
    const newIndex = categories.indexOf(over.id as string);

    const newOrder = [...categories];
    newOrder.splice(newIndex, 0, newOrder.splice(oldIndex, 1)[0]);

    const updated = services.map((s) => ({
      ...s,
      category_order: newOrder.indexOf(s.category),
    }));

    setServices(updated);

    for (const cat of newOrder) {
      await supabase
        .from("services")
        .update({ category_order: newOrder.indexOf(cat) })
        .eq("category", cat);
    }
  };

  // ---------------------------
  // SERVICE DRAG END
  // ---------------------------
  const handleServiceDrag = async (category: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = grouped
      .find((g) => g.category === category)!
      .services.map((s) => s.id);

    const oldIndex = items.indexOf(active.id as string);
    const newIndex = items.indexOf(over.id as string);

    const reordered = [...items];
    reordered.splice(newIndex, 0, reordered.splice(oldIndex, 1)[0]);

    const updated = services.map((s) => {
      if (s.category === category) {
        return {
          ...s,
          display_order: reordered.indexOf(s.id),
        };
      }
      return s;
    });

    setServices(updated);

    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from("services")
        .update({ display_order: i })
        .eq("id", reordered[i]);
    }
  };

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <div className="services-list">
      {/* CATEGORY DRAG CONTEXT */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleCategoryDrag}
      >
        <SortableContext
          items={categories}
          strategy={verticalListSortingStrategy}
        >
          {grouped.map((g) => (
            <div key={g.category} className="category-block">
              {/* CATEGORY HEADER */}
              <CategoryItem
                id={g.category}
                collapsed={collapsed[g.category]}
                servicesCount={g.services.length}
                onToggle={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [g.category]: !prev[g.category],
                  }))
                }
              />

              {/* CATEGORY BODY */}
              <div
                className={`category-services ${
                  collapsed[g.category] ? "collapsed" : "expanded"
                }`}
              >
                {/* ⭐ HEADER ROW — NOT SORTABLE */}
                <div className="service-header-row service-grid">
                  <span></span>
                  <span>Naam</span>
                  <span>Prijs</span>
                  <span>Promo</span>
                  <span>Duur</span>
                  <span>Buffer</span>
                  <span></span>
                  <span></span>
                </div>

                {/* SERVICE DRAG CONTEXT */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleServiceDrag(g.category, e)}
                >
                  <SortableContext
                    items={g.services.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="service-list">
                      {g.services.map((svc) => (
                        <ServiceItem
                          key={svc.id}
                          svc={svc}
                          onLocalUpdate={updateLocal}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
