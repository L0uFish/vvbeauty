"use client";

import { useEffect, useRef, useState } from "react";
import "../../styles/home/herocarousel.css";

// Utility: shuffle an array
const shuffleArray = (array: string[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function HeroCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<string[]>([]);

  // === Load and shuffle images once ===
  useEffect(() => {
    // ✅ Correct public path
    const imported = Array.from({ length: 26 }, (_, i) => `/carousel_pictures/${i + 1}.jpg`);
    setImages(shuffleArray(imported));
  }, []);

  // === Animate horizontal scroll ===
  useEffect(() => {
    const track = trackRef.current;
    if (!track || images.length === 0) return;

    let offset = 0;
    let rafId: number;

    const animate = () => {
      offset -= 1; // scrolling speed
      if (Math.abs(offset) >= track.scrollWidth / 2) offset = 0;
      track.style.transform = `translateX(${offset}px)`;
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [images]);

  // === Render ===
  if (images.length === 0) return null;

  return (
    <div className="carousel-container">
      <div className="carousel-track" ref={trackRef}>
        {[...images, ...images].map((img, i) => (
          <div className="carousel-frame" key={i}>
            <img src={img} alt={`VVBeauty ${i + 1}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
