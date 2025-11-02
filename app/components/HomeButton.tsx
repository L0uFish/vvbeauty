"use client";

import Link from "next/link";
import { Home } from "lucide-react"; // modern icon set already in Next + shadcn setups
import "../styles/HomeButton.css";

export default function HomeButton() {
  return (
    <Link href="/" className="home-button" aria-label="Ga naar startpagina">
      <Home className="home-icon" />
    </Link>
  );
}
