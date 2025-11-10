"use client";

import { Suspense } from "react";
import PlannenInner from "./PlannenInner";
import HomeButton from "../components/home/HomeButton";
import Header from "../components/home/LoginBtn";

export default function PlannenClient({ initialService }: { initialService: any }) {
  return (
    <Suspense fallback={<main className="p-6">Laden...</main>}>
      <HomeButton />
      <Header />
      <PlannenInner initialService={initialService} />
    </Suspense>
  );
}
