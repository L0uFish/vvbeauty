"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import "../../styles/Modals.css";

// Define a minimal interface for the general hour data
interface GeneralHourDefault {
    weekday: string;
    open_time: string | null;
    close_time: string | null;
    is_closed: boolean;
}

export default function OverrideModal({
    open,
    onClose,
    selectedDays,
    onSaved,
}: {
    open: boolean;
    onClose: () => void;
    selectedDays: Date[];
    onSaved?: () => void;
}) {
    const [mounted, setMounted] = useState(false);
    const [openTime, setOpenTime] = useState("09:00");
    const [closeTime, setCloseTime] = useState("17:00");
    const [isClosed, setIsClosed] = useState(false);
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [existingRecords, setExistingRecords] = useState<any[]>([]);
    // New state to hold the default general hours for the selected days
    const [defaultHours, setDefaultHours] = useState<Record<string, GeneralHourDefault>>({}); 

    useEffect(() => setMounted(true), []);

    // 🕓 Fetch existing custom hours AND general hours for selected days
    useEffect(() => {
        // Reset form states and records when closing/days change
        if (!open || !selectedDays.length) {
            setExistingRecords([]);
            setDefaultHours({});
            setOpenTime("09:00");
            setCloseTime("17:00");
            setIsClosed(false);
            setNote("");
            return;
        }

        const fetchExisting = async () => {
            const dateStrings = selectedDays.map(d => 
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            );
            const weekdays = selectedDays.map(d => 
                d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
            );
            
            // 1. Fetch Custom (Override) Hours
            const { data: customData } = await supabase
                .from("custom_hours")
                .select("id, date, open_time, close_time, is_closed, notes")
                .in("date", dateStrings);

            setExistingRecords(customData || []);

            // 2. Fetch General (Default) Hours
            const uniqueWeekdays = Array.from(new Set(weekdays));
            const { data: generalData, error: generalError } = await supabase
                .from("general_hours")
                .select("weekday, open_time, close_time, is_closed")
                .in("weekday", uniqueWeekdays);

            if (generalError) {
                console.error("💥 Error fetching general hours:", generalError);
            }

            // Map general hours to the selected dates for easy reset reference
            const defaults: Record<string, GeneralHourDefault> = {};
            if (generalData) {
                selectedDays.forEach(date => {
                    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                    const defaultDay = generalData.find(g => g.weekday === weekday) as GeneralHourDefault;
                    if (defaultDay) {
                        defaults[dateString] = defaultDay;
                    }
                });
            }
            setDefaultHours(defaults);

            // 3. Pre-fill form if only ONE day is selected AND a custom record exists
            if (selectedDays.length === 1 && customData && customData.length > 0) {
                const firstRecord = customData[0];
                setOpenTime(firstRecord.open_time?.substring(0, 5) || "09:00");
                setCloseTime(firstRecord.close_time?.substring(0, 5) || "17:00");
                setIsClosed(firstRecord.is_closed);
                setNote(firstRecord.notes || "");
            }
        };
        fetchExisting();

    }, [open, selectedDays]); 

    // Hooks Violation Fix: This must be after all hooks
    if (!mounted || !open) return null; 

    // 🔄 Function to reset the date(s) by deleting the custom record(s)
    const handleReset = async () => {
        if (!selectedDays.length) return;
        
        // Only get IDs of records that currently exist as overrides
        const idsToDelete = existingRecords.map(r => r.id);

        if (idsToDelete.length === 0) {
            alert("Er zijn geen uitzonderlijke uren om te herstellen voor de geselecteerde dag(en).");
            return;
        }

        if (!confirm(`Weet u zeker dat u de uitzonderlijke uren voor ${selectedDays.length} dag(en) wilt verwijderen? De standaarduren zullen van toepassing zijn.`)) {
            return;
        }

        setLoading(true);
        try {
            console.log("🗑️ Deleting override records:", idsToDelete);
            
            // Delete the custom records, forcing the application to use general_hours
            const { error: deleteError } = await supabase
                .from("custom_hours")
                .delete()
                .in("id", idsToDelete);

            if (deleteError) throw deleteError;

            console.log("✅ Override successfully reset (records deleted).");
            
            // Reset the local form state to a default/initial state
            setOpenTime("09:00");
            setCloseTime("17:00");
            setIsClosed(false);
            setNote("");

            onSaved?.();
            onClose();

        } catch (err) {
            console.error("💥 Error resetting override:", err);
            alert("Er is een fout opgetreden bij het herstellen van de standaarduren.");
        } finally {
            setLoading(false);
        }
    };


    // 💾 Saves the updated hours to the database (handleSave is unchanged from previous fix)
    const handleSave = async () => {
        if (!selectedDays.length) {
            alert("Geen dagen geselecteerd!");
            return;
        }

        setLoading(true);
        try {
            const recordsToSave = selectedDays.map((date) => {
                const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                const existing = existingRecords.find(r => r.date === dateString);

                // Start with the base object structure
                const record: any = { 
                    type: "day", 
                    date: dateString,
                    month: date.getMonth() + 1,
                    year: date.getFullYear(),
                    open_time: isClosed ? null : `${openTime}:00`,
                    close_time: isClosed ? null : `${closeTime}:00`,
                    is_closed: isClosed,
                    notes: note,
                };

                // CRITICAL FIX: Only include 'id' if updating an existing record.
                if (existing) {
                    record.id = existing.id;
                }

                return record;
            });

            console.log("💾 Saving override records:", recordsToSave);
            
            const { error } = await supabase
                .from("custom_hours")
                .upsert(recordsToSave, { onConflict: 'id' }); 

            if (error) throw error;
            
            console.log("✅ Override saved successfully!");
            onSaved?.();
            onClose();
            
        } catch (err) {
            console.error("💥 Error saving override:", err);
            alert("Er is een fout opgetreden bij het opslaan van de uitzonderlijke uren.");
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Specifieke dag/week/maand aanpassen</h3>

                <label>Openingsuur</label>
                <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    disabled={isClosed}
                />

                <label>Sluitingsuur</label>
                <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    disabled={isClosed}
                />

                <label>Opmerking</label>
                <textarea
                    placeholder="Bijv. feestdag, uitzonderlijk gesloten..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                />

                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <input
                        type="checkbox"
                        checked={isClosed}
                        onChange={(e) => setIsClosed(e.target.checked)}
                    />
                    Gesloten
                </label>

                <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                    {/* 🆕 NEW RESET BUTTON */}
                    {existingRecords.length > 0 && (
                        <button 
                            onClick={handleReset} 
                            disabled={loading}
                            style={{ backgroundColor: '#cc0000', color: 'white' }}
                        >
                            {loading ? "Resetten..." : "Standaarduren Herstellen"}
                        </button>
                    )}
                    
                    <button onClick={handleSave} disabled={loading}>
                        {loading ? "Opslaan..." : "Opslaan"}
                    </button>
                    <button onClick={onClose} disabled={loading}>Annuleren</button>
                </div>
            </div>
        </div>,
        document.body
    );
}