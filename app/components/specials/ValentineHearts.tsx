"use client";

import { useEffect, useRef } from "react";
import "@/app/styles/specials/ValentineHearts.css";

type Heart = {
  x: number;
  y: number;
  vy: number;      // upward speed
  size: number;    // visual size
  opacity: number;
  swaySeed: number;
  hueShift: number; // tiny colour variation if you want
};

export default function ValentineHeartsEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resizeCanvas = () => {
      dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      // IMPORTANT: reset transform before scaling (prevents cumulative scaling)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const heartCount = 80;

    const hearts: Heart[] = Array.from({ length: heartCount }).map(() => ({
      x: Math.random() * width,
      y: height + Math.random() * height, // start offscreen-ish
      vy: 0.25 + Math.random() * 0.9,
      size: 6 + Math.random() * 14,
      opacity: 0.10 + Math.random() * 0.25,
      swaySeed: Math.random() * 100,
      hueShift: -20 + Math.random() * 30,
    }));

    const respawn = (h: Heart) => {
      h.x = Math.random() * width;
      h.y = height + h.size + Math.random() * (height * 0.4);
      h.vy = 0.25 + Math.random() * 0.9;
      h.size = 6 + Math.random() * 14;
      h.opacity = 0.25 + Math.random() * 0.6;
      h.swaySeed = Math.random() * 1000;
      h.hueShift = -10 + Math.random() * 20;
    };

    // Draw a heart at (x, y) in canvas coordinates
    const drawHeart = (x: number, y: number, size: number) => {
      // Heart shape using bezier curves (simple + pretty)
      ctx.beginPath();
      const topCurveHeight = size * 0.3;

      ctx.moveTo(x, y + topCurveHeight);
      ctx.bezierCurveTo(
        x,
        y,
        x - size * 0.5,
        y,
        x - size * 0.5,
        y + topCurveHeight
      );
      ctx.bezierCurveTo(
        x - size * 0.5,
        y + size * 0.65,
        x,
        y + size * 0.9,
        x,
        y + size
      );
      ctx.bezierCurveTo(
        x,
        y + size * 0.9,
        x + size * 0.5,
        y + size * 0.65,
        x + size * 0.5,
        y + topCurveHeight
      );
      ctx.bezierCurveTo(
        x + size * 0.5,
        y,
        x,
        y,
        x,
        y + topCurveHeight
      );
      ctx.closePath();
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      const t = performance.now() / 1000;

      for (const h of hearts) {
        // Move upwards
        h.y -= h.vy;

        // Gentle sideways drift + wobble
        const sway =
          Math.sin(t * 1.2 + h.swaySeed) * 0.6 +
          Math.sin(t * 2.3 + h.swaySeed * 0.7) * 0.35;
        h.x += sway;

        // Wrap / respawn if off top
        if (h.y < -h.size * 2) respawn(h);

        // Keep within bounds a bit
        if (h.x < -20) h.x = width + 20;
        if (h.x > width + 20) h.x = -20;

        // Style: pink/red with subtle shadow glow
        const baseHue = 345; // pinkish red
        const hue = baseHue + h.hueShift;

        ctx.save();
        ctx.globalAlpha = h.opacity;

        ctx.shadowColor = "rgba(255, 90, 150, 0.35)";
        ctx.shadowBlur = Math.max(6, h.size * 0.6);

        drawHeart(h.x, h.y, h.size);

        // Fill + optional soft highlight
        ctx.fillStyle = `hsl(${hue} 85% 65%)`;
        ctx.fill();

        // Tiny highlight stroke (optional)
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.stroke();

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="vvbeauty-hearts-wrapper">
      <canvas ref={canvasRef} className="vvbeauty-hearts-canvas" />
    </div>
  );
}
