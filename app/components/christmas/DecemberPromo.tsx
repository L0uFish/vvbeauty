"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import "../../styles/christmas/DecemberPromo.css";

export default function DecemberPromo() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const closed = localStorage.getItem("vvbeauty_banner_closed");
    if (!closed) setVisible(true);
  }, []);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem("vvbeauty_banner_closed", "true");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="vvbeauty-banner"
        >
          <p className="banner-text">
            ✨ <strong>€10 korting</strong> op alle behandelingen in december! 💅
          </p>

          <div className="banner-actions">
            <Link href="/diensten" className="banner-btn">
              Bekijk Diensten
            </Link>
            <button
              className="banner-close"
              onClick={handleClose}
              aria-label="Sluiten"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
