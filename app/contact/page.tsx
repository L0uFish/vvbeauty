"use client";

import HeroCarousel from "../components/home/HeroCarousel";
import Header from "../components/home/LoginBtn";
import HomeButton from "../components/home/HomeButton";
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
  return (
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
              <Clock className="icon" />
              <span>Maandag t.e.m. Zaterdag — <b>op afspraak</b></span>
            </div>

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
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
              >
                <Instagram size={18} />
                Instagram
              </a>

              <a
                href="https://www.facebook.com/"
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
      </section>
    </main>
  );
}
