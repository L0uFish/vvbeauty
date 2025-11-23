"use client";

import { useEffect, useRef } from "react";
import "@/app/styles/specials/SnowfallEffect.css";

export default function SnowfallEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let width = 0;
    let height = 0;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const flakeCount = 140;
    const flakes: {
      x: number;
      y: number;
      vy: number;
      size: number;
      opacity: number;
    }[] = [];

    for (let i = 0; i < flakeCount; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: 0.3 + Math.random() * 0.9,
        size: 0.8 + Math.random() * 2.5,
        opacity: 0.4 + Math.random() * 0.6,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      for (const f of flakes) {
        f.y += f.vy;
        f.x += Math.sin(Date.now() / 1000 + f.y / 50) * 0.2; // gentle breeze
        if (f.y > height) {
          f.y = -f.size;
          f.x = Math.random() * width;
          f.vy = 0.3 + Math.random() * 0.9;
        }

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${f.opacity})`;
        ctx.shadowColor = "rgba(255,255,255,0.7)";
        ctx.shadowBlur = 4 * (1.5 - f.size / 4);
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    draw();
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  return (
    <div className="vvbeauty-snowfall-wrapper">
      <canvas ref={canvasRef} className="vvbeauty-snowfall-canvas" />
    </div>
  );
}