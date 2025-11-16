"use client";

import "../../styles/legal.css";

export default function LegalModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="legal-overlay">
      <div className="legal-modal">
        <button className="legal-close" onClick={onClose}>×</button>

        <h2 className="legal-title">VVBeauty — Privacyverklaring</h2>
        <p>Laatst bijgewerkt: 15 november 2025</p>

        <p>
          VVBeauty, eigendom van <b>Vanswijgenhoven Veronique</b> (BE1002643369),
          gevestigd te Goorkenshof 36, 2260 Westerlo, België, hecht veel belang
          aan jouw privacy. Deze privacyverklaring legt uit welke gegevens wij
          verzamelen en waarom.
        </p>

        <h3>1. Verwerkingsverantwoordelijke</h3>
        <p>
          VVBeauty<br />
          Vanswijgenhoven, Veronique<br />
          Goorkenshof 36, 2260 Westerlo, België<br />
          Ondernemingsnummer: BE1002643369<br />
          E-mail: info@vvbeauty.be
        </p>

        <h3>2. Welke gegevens verzamelen wij?</h3>
        <ul>
          <li>Naam</li>
          <li>E-mailadres</li>
          <li>Telefoonnummer</li>
          <li>Geboekte dienst + datum & tijdstip</li>
        </ul>

        <h3>3. Waarom verwerken wij deze gegevens?</h3>
        <p><b>Contractuele noodzaak:</b> afspraken inboeken en bevestigen.</p>
        <p><b>Wettelijke verplichting:</b> boekhoudkundige bewaartermijnen.</p>
        <p><b>Gerechtvaardigd belang:</b> communicatie rond afspraken.</p>

        <h3>4. Met wie delen we gegevens?</h3>
        <ul>
          <li><b>Supabase</b> – database & authenticatie</li>
          <li><b>Vercel</b> – hosting</li>
          <li><b>Mailersend</b> – e-mail communicatie</li>
        </ul>

        <h3>5. Bewaartermijnen</h3>
        <ul>
          <li>Afspraken & klanten: max. 24 maanden</li>
          <li>Boekhouding: 7 jaar</li>
          <li>E-mails: 12 maanden</li>
        </ul>

        <h3>6. Beveiliging</h3>
        <p>
          SSL (https), beveiligde database, beperkte toegang, automatische beveiliging.
        </p>

        <h3>7. Jouw rechten</h3>
        <p>
          Je hebt recht op inzage, correctie, verwijdering, beperking,
          bezwaar en overdraagbaarheid.  
          Contact: <b>info@vvbeauty.be</b>
        </p>

        <h3>8. Cookies</h3>
        <p>
          VVBeauty gebruikt enkel functionele cookies
          (supabase-auth, sessiecookies).  
          Geen tracking, analytics of advertentiecookies.
        </p>

        <h2 className="legal-title">VVBeauty — Impressum</h2>

        <p>
          VVBeauty<br />
          Vanswijgenhoven, Veronique<br />
          Goorkenshof 36, 2260 Westerlo, België<br />
          Ondernemingsnummer: BE1002643369<br />
          Startdatum: 02-01-2024<br />
          E-mail: info@vvbeauty.be
        </p>

        <h2 className="legal-title">Auteursrechtverklaring</h2>

        <p>
          © 2025 VVBeauty / Veronique Vanswijgenhoven.  
          Alle foto’s, teksten en ontwerpen zijn beschermd door het auteursrecht.
          Gebruik zonder schriftelijke toestemming is verboden.
        </p>
      </div>
    </div>
  );
}
