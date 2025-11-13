// app/admin/diensten/components/AddButton.tsx
"use client";

import { useState } from "react";
import AddServiceModal from "./AddServiceModal";

export default function AddButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-addservice">
        + Nieuwe dienst
      </button>
      {open && <AddServiceModal onClose={() => setOpen(false)} />}
    </>
  );
}