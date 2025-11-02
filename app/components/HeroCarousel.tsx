"use client";

import { useEffect, useRef } from "react";

const mockImages = Array.from({ length: 12 }).map(
  (_, i) => `https://picsum.photos/seed/vvbeauty${i}/400/400`
);

export default function HeroCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let offset = 0;
    let rafId: number;

    const animate = () => {
      offset -= 0.5; // scrolling speed
      if (Math.abs(offset) >= track.scrollWidth / 2) offset = 0;
      track.style.transform = `translateX(${offset}px)`;
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="carousel-container">
      <div className="carousel-track" ref={trackRef}>
        {[...mockImages, ...mockImages].map((img, i) => (
          <div className="carousel-frame" key={i}>
            <img src={img} alt={`VVBeauty ${i + 1}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
