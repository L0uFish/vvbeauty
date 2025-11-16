"use client";

import HeroCarousel from "../components/home/HeroCarousel";
import Header from "../components/home/LoginBtn";
import HomeButton from "../components/home/HomeButton";
import LegalModal from "../components/legal/LegalModal";
import { useState } from "react";
import "../styles/contact.css";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  MessageCircle,
} from "lucide-react";

export default function Contact() {
  const [showLegal, setShowLegal] = useState(false);

  return (
    <>
      {showLegal && <LegalModal onClose={() => setShowLegal(false)} />}
      <main className="contact-container">
        <Header />
        <HomeButton />

      {/* Hero */}
      <section className="hero-section">
        <HeroCarousel />
        <div className="hero-overlay">
          <h1 className="hero-title">Contact & Info</h1>
        </div>
      </section>

      {/* Contact Info */}
      <section className="contact-section">
        <div className="contact-card">
          {/* LEFT SIDE */}
          <div className="contact-left">
            <h2 className="contact-heading">VVBeauty</h2>

            <div className="contact-item">
              <Phone className="icon" />
              <a href="tel:+32477442293">+32 477 44 22 93</a>
            </div>

            <div className="contact-item">
              <Mail className="icon" />
              <a href="mailto:veronique.vans@hotmail.com">
                info@vvbeauty.be
              </a>
            </div>

            <div className="contact-item">
              <MapPin className="icon" />
              <span>Goorkenshof 36, 2260 Westerlo</span>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="contact-right">
            <div className="socials-right">
              <a
                href="https://wa.me/32477442293"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
              >
                <MessageCircle size={18} />
                WhatsApp
              </a>

              <a
                href="https://www.instagram.com/vv_beauty1/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
              >
                <Instagram size={18} />
                Instagram
              </a>

              <a
                href="https://www.facebook.com/profile.php?id=61554889833124&locale=nl_BE"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
              >
                <Facebook size={18} />
                Facebook
              </a>
            </div>
          </div>
        </div>
        <button
          className="legal-link"
          onClick={() => setShowLegal(true)}
          >Juridische informatie & privacy
          </button>
      </section>
    </main>
    </>
  );
}
