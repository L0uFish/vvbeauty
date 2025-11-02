"use client";

import { Suspense } from "react";
import PlannenInner from "./PlannenInner";
import HomeButton from "../components/HomeButton";

export default function PlannenClient() {
  return (
    <Suspense fallback={<main className="p-6">Laden...</main>}>
      <HomeButton />
      <PlannenInner />
    </Suspense>
  );
}
