"use client";

import { useEffect, useState } from "react";

type Side = "left" | "right" | "top" | "bottom";

type Brownie = {
  id: number;
  side: Side;
  start: number;
  duration: number;
  spinDir: number;
  scale: number;
  golden?: boolean;
};

export default function BrownieEasterEgg() {
  const [typed, setTyped] = useState("");
  const [brownies, setBrownies] = useState<Brownie[]>([]);

  useEffect(() => {
    let counter = 0;

    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const newTyped = (typed + key).slice(-7);
      setTyped(newTyped);

      if (newTyped.includes("brownie")) {
        spawnBrownie();
        setTyped("");
      }

      if (key === "e" && brownies.length > 0) {
        spawnBrownie();
      }
    };

    const spawnBrownie = () => {
      counter++;
      const sides: Side[] = ["left", "right", "top", "bottom"];
      const side = sides[Math.floor(Math.random() * sides.length)];
      const isGolden = Math.random() < 0.01; // 10% chance

      const newBrownie: Brownie = {
        id: Date.now() + counter,
        side,
        start: Math.random() * 100,
        duration: (isGolden ? 6 : 4) + Math.random() * (isGolden ? 3 : 4),
        spinDir: Math.random() > 0.5 ? 1 : -1,
        scale: 0.7 + Math.random() * 0.8,
        golden: isGolden,
      };

      setBrownies((prev) => [...prev, newBrownie]);

      setTimeout(() => {
        setBrownies((prev) => prev.filter((b) => b.id !== newBrownie.id));
      }, newBrownie.duration * 1000);
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [typed, brownies.length]);

  return (
    <>
      {brownies.map((b) => (
        <div
          key={b.id}
          className={`brownie-epic-wrapper ${b.side} ${b.golden ? "golden" : ""}`}
          style={{
            "--start": `${b.start}%`,
            "--dur": `${b.duration}s`,
            "--spinDir": b.spinDir,
            "--scaleStart": b.scale,
          } as React.CSSProperties}
        >
          <img src="/Brownie.png" alt="Brownie" className="brownie-epic" />
          <div className="sparkle-container">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={`sparkle ${b.golden ? "gold" : ""}`} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
