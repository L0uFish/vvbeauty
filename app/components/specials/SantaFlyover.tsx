"use client";
import { useEffect, useState } from "react";
import "@/app/styles/specials/SantaFlyover.css";

export default function SantaFlyover() {
  const [visible, setVisible] = useState(false);
  const [direction, setDirection] = useState<"right" | "left">("right");
  const [flightStyle, setFlightStyle] = useState({
    top: "55%",
    duration: 25,
  });

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 5000); // wait 5s
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const loop = () => {
      const newTop = `${45 + Math.random() * 20}%`;
      const newDuration = 20 + Math.random() * 15;
      setDirection((d) => (d === "right" ? "left" : "right"));
      setFlightStyle({ top: newTop, duration: newDuration });
    };

    const interval = setInterval(loop, flightStyle.duration * 1000);
    return () => clearInterval(interval);
  }, [visible, flightStyle.duration]);

  if (!visible) return null;

  return (
    <div className="santa-wrapper">
      <div
        className={`santa-flight santa-${direction}`}
        style={{
          top: flightStyle.top,
          animationDuration: `${flightStyle.duration}s`,
        }}
      >
        <img
          src="https://media.baamboozle.com/uploads/images/1122/1638877168_1791423_gif-url.gif"
          alt="Santa flying"
          className="santa-img"
        />
        <div className="santa-trail"></div>
      </div>
    </div>
  );
}