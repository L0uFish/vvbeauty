"use client";
import Link from "next/link";

export default function ActionButtons() {
  return (
    <div className="action-buttons">
       <Link href="/diensten" className="action-button">
        <h3>Boek je Afspraak</h3>
      </Link>

      <Link href="/prijslijst" className="action-button">
        <h3>Diensten & Prijzen</h3>
      </Link>

      <Link href="/contact" className="action-button">
        <h3>Contactgegevens</h3>
      </Link>
    </div>
  );
}
