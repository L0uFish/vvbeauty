"use client";

import { Suspense } from "react";
import PlannenInner from "./PlannenInner";
import HomeButton from "../components/HomeButton";
import Header from "../components/Header";

export default function PlannenClient() {
  return (
    <Suspense fallback={<main className="p-6">Laden...</main>}>
      <HomeButton />
      <Header />
      <PlannenInner />
    </Suspense>
  );
}
