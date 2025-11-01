"use client";

import { Suspense } from "react";
import PlannenInner from "./PlannenInner";

export default function PlannenClient() {
  return (
    <Suspense fallback={<main className="p-6">Laden...</main>}>
      <PlannenInner />
    </Suspense>
  );
}
