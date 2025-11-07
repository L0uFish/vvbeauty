"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import "../../styles/Modals.css";

// Define a type for your hour data structure
interface GeneralHour {
    id: string;
    idx: number;
    weekday: string;
    open_time: string | null;
    close_time: string | null;
    is_closed: boolean;
    created_at: string;
    updated_at: string;
}

export default function GeneralHoursModal({
    open,
    onClose,
    onSaved,
}: {
    open: boolean;
    onClose: () => void;
    selectedDays?: Date[];
    onSaved?: () => void;
}) {
    const [mounted, setMounted] = useState(false);
    const [hours, setHours] = useState<GeneralHour[]>([]); // Use the defined type
    const [loading, setLoading] = useState(false);

    useEffect(() => setMounted(true), []);

    // 🕓 Fetch existing general hours on mount
    useEffect(() => {
        const fetchHours = async () => {
            if (!open) return; // Only fetch when the modal is intended to be open

            console.log("🕓 Fetching general_hours...");
            const { data, error } = await supabase
                .from("general_hours")
                .select("*")
                .order("idx");
            if (error) {
                console.error("💥 Error fetching general_hours:", error);
                return;
            }
            console.log("✅ Loaded general_hours:", data);
            setHours(data as GeneralHour[]); // Cast the data to the defined type
        };
        fetchHours();
    }, [open]); // Fetch when the modal opens

    // 🔄 Handles local state changes when users interact with inputs
    const handleChange = (weekday: string, field: keyof GeneralHour, value: any) => {
        setHours((prevHours) =>
            prevHours.map((h) => {
                if (h.weekday === weekday) {
                    
                    // 🛑 FIX 1: Handle closing (is_closed = true)
                    if (field === "is_closed" && value === true) {
                        return {
                            ...h,
                            is_closed: true,
                            open_time: null, // Clear time fields
                            close_time: null,
                        };
                    }
                    
                    // 🛑 FIX 2: Handle re-opening (is_closed = false) - CRUCIAL FIX
                    // Inject default times into state when the closed box is unchecked.
                    if (field === "is_closed" && value === false) {
                        return {
                            ...h,
                            is_closed: false,
                            open_time: "09:00:00", // Provide default open time
                            close_time: "17:00:00", // Provide default close time
                        };
                    }

                    // --- Standard Time Change Logic ---
                    let updatedValue = value;

                    // Special logic for time fields: append :00 for PostgreSQL
                    if (
                        (field === "open_time" || field === "close_time") &&
                        typeof value === "string" &&
                        value.length === 5 // e.g., "09:00"
                    ) {
                        // Append seconds for the database (PostgreSQL 'time without time zone' expects H:M:S)
                        updatedValue = value + ":00";
                    }

                    // Return the updated hour object
                    return {
                        ...h,
                        [field]: updatedValue,
                        // Ensure is_closed is set to false if times are being edited
                        ...(field !== "is_closed" && { is_closed: false }),
                    };
                }
                return h;
            })
        );
    };

    // 💾 Saves the updated hours to the database
    const handleSave = async () => {
        setLoading(true);
        let hasError = false;

        // Iterate through all days and update them in the database
        for (const hour of hours) {
            // Prepare the data for update (only include mutable fields)
            const updateData = {
                open_time: hour.open_time,
                close_time: hour.close_time,
                is_closed: hour.is_closed,
            };

            // Perform the update for the specific day (using the primary key 'id')
            const { error } = await supabase
                .from("general_hours")
                .update(updateData)
                .eq("id", hour.id); // Update by ID is the most reliable method

            if (error) {
                console.error(`💥 Error updating ${hour.weekday}:`, error);
                hasError = true;
                // Stop on the first error to alert the user immediately
                break; 
            }
        }

        setLoading(false);

        if (!hasError) {
            console.log("✅ All general_hours updated successfully.");
            onClose(); // Close the modal on success
            if (onSaved) onSaved(); // Run any post-save actions
        } else {
            alert("Er is een fout opgetreden bij het opslaan van één of meerdere dagen.");
        }
    };

    // Conditional return must be AFTER all hooks have been called
    if (!mounted || !open) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Algemene openingsuren</h3>

                {hours.map((h) => (
                    <div key={h.weekday} style={{ marginBottom: "0.8rem" }}>
                        <strong style={{ textTransform: "capitalize" }}>{h.weekday}</strong>
                        <br />
                        <label>
                            <input
                                type="checkbox"
                                checked={h.is_closed}
                                onChange={(e) =>
                                    handleChange(h.weekday, "is_closed", e.target.checked)
                                }
                            />{" "}
                            Gesloten
                        </label>
                        {!h.is_closed && (
                            <>
                                <br />
                                <label>
                                    Open:{" "}
                                    <input
                                        type="time"
                                        value={
                                            h.open_time
                                            ? h.open_time.substring(0, 5)
                                            : h.is_closed
                                            ? "" // keep empty when closed
                                            : "09:00" // only show default when reopening
                                        }
                                        onChange={(e) => handleChange(h.weekday, "open_time", e.target.value)}
                                        />

                                        <input
                                        type="time"
                                        value={
                                            h.close_time
                                            ? h.close_time.substring(0, 5)
                                            : h.is_closed
                                            ? ""
                                            : "17:00"
                                        }
                                        onChange={(e) => handleChange(h.weekday, "close_time", e.target.value)}
                                    />
                                </label>
                            </>
                        )}
                    </div>
                ))}

                <div className="modal-actions">
                    <button onClick={handleSave} disabled={loading}>
                        {loading ? "Opslaan..." : "Opslaan"}
                    </button>
                    <button onClick={onClose} disabled={loading}>
                        Annuleren
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}