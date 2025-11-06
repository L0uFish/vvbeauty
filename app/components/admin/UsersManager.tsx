"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import "../../styles/UsersManager.css";
import React from "react";

// --- Types ---
type Client = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  notes: string | null;
};

// --- Add User Modal Component ---
interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newClientData: Omit<Client, "id">) => Promise<void>;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      alert("Naam en E-mail zijn verplicht.");
      return;
    }

    try {
      await onAdd({ full_name: fullName, email, phone, notes });
      onClose(); 
      
      // Reset form fields on success
      setFullName("");
      setEmail("");
      setPhone("");
      setNotes("");
    } catch (error) {
      // Error message from handleAddUser's error boundary
      alert(error instanceof Error ? error.message : "Er ging iets mis bij het toevoegen van de gebruiker.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          ×
        </button>
        <h2>Nieuwe Klant Toevoegen</h2>
        <form onSubmit={handleSubmit} className="user-form">
          <label>
            Volledige Naam:
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>

          <label>
            E-mail:
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Telefoonnummer:
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label>
            Opmerkingen (Notes):
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </label>

          <button type="submit" className="add-user-btn">
            Klant Opslaan
          </button>
        </form>
      </div>
    </div>
  );
};


// --- UsersManager Component ---

export default function UsersManager() {
  const [users, setUsers] = useState<Client[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Client[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch users from Supabase
  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from("clients").select("id, full_name, phone, email, notes");
    if (error) {
      console.error(error);
      return;
    }
    const clientData = data as Client[];
    setUsers(clientData);
    handleSearch(searchQuery, clientData); 
  }, [searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle filtering of users based on search query
  const handleSearch = (query: string, userList = users) => {
    setSearchQuery(query);
    const lowercasedQuery = query.toLowerCase();
    const filtered = userList.filter((user) => {
      const fullName = user.full_name?.toLowerCase() || "";
      const phone = user.phone?.toLowerCase() || "";
      const email = user.email?.toLowerCase() || "";
      const notes = user.notes?.toLowerCase() || "";
      
      return (
        fullName.includes(lowercasedQuery) ||
        phone.includes(lowercasedQuery) ||
        email.includes(lowercasedQuery) ||
        notes.includes(lowercasedQuery)
      );
    });
    setFilteredUsers(filtered);
  };
  
  const handleAddUser = async (newClientData: Omit<Client, "id">) => {
    
    // We only create the user in auth.users. 
    // A database trigger is assumed to automatically create the row in the 'clients' table.
    
    // Use a temporary password that meets standard complexity requirements
    const tempPassword = Math.random().toString(36).slice(-10) + "A1!"; 

    try {
        // 1. Create the user in Supabase Auth
        const { error: authError } = await supabase.auth.signUp({
            email: newClientData.email,
            password: tempPassword,
            options: {
                data: {
                    // Pass initial client data as user metadata
                    full_name: newClientData.full_name,
                    phone: newClientData.phone,
                    notes: newClientData.notes,
                    role: 'client',
                }
            }
        });

        if (authError) {
            if (authError.message.includes('User already registered')) {
                throw new Error("Dit e-mailadres is al geregistreerd in het systeem. Gebruik een ander e-mailadres.");
            }
            throw authError;
        }

        // 2. Wait for the database trigger to execute and insert the client data
        // We use a small delay before re-fetching the list.
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        await fetchUsers(); 
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Onbekende fout bij het aanmaken van de Auth-gebruiker.";
        console.error("Technical error during user signup:", error);
        throw new Error(`Fout bij account aanmaken: ${errorMessage}`);
    }
  };


  const handleDelete = async (id: string) => {
    try {
      if (!window.confirm("Weet je zeker dat je deze klant wilt verwijderen? Dit verwijdert de gebruiker ook uit Supabase Auth.")) return;
      
      // The best practice is to delete from auth.users (requires service role key/admin context)
      // or to rely on the cascade from clients -> auth.users if RLS allows it.
      
      // Since you are in an Admin context, we can attempt to delete the Auth user,
      // which should cascade the delete to the 'clients' table if configured.
      const { error: authError } = await supabase.auth.admin.deleteUser(id);

      if (authError) {
        console.error("Error deleting auth user:", authError);
        // Fallback: If deleting the auth user fails (e.g., RLS/permissions), try deleting from clients directly.
        // NOTE: This will likely leave a dangling user in auth.users unless cascade is set up.
        const { error: clientError } = await supabase.from("clients").delete().eq("id", id);
        if (clientError) throw clientError;
      }
      
      setUsers(users.filter((user) => user.id !== id));
      setFilteredUsers(filteredUsers.filter((user) => user.id !== id));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Fout bij het verwijderen van de klant.");
    }
  };

  const handleEdit = (field: string, value: string, userId: string) => {
    setIsEditing(userId + field);
    setEditValue(value);
  };

  const handleSaveEdit = async (userId: string, field: string) => {
    try {
      const updatedData = { [field]: editValue, updated_at: new Date().toISOString() };

      const { error } = await supabase
        .from("clients")
        .update(updatedData)
        .eq("id", userId);

      if (error) throw error;
      
      // Update local state
      const updatedUsers = users.map((user) =>
        user.id === userId ? { ...user, [field]: editValue } : user
      );
      setUsers(updatedUsers);
      handleSearch(searchQuery, updatedUsers); 
      
      setIsEditing(null);
    } catch (error) {
      console.error("Error saving edit:", error);
      alert("Fout bij opslaan van de wijziging.");
    }
  };

  return (
    <div className="table-container">
      {/* Search Bar and Add Button */}
      <div className="controls-header">
        <input
          type="text"
          placeholder="Zoeken naar gebruiker"
          className="search-input"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <button
          className="add-user-trigger"
          onClick={() => setIsModalOpen(true)}
        >
          ➕ Klant Toevoegen
        </button>
      </div>

      <table className="table-auto w-full">
        <thead>
          <tr>
            <th className="px-4 py-2"><u>Naam</u></th>
            <th className="px-4 py-2"><u>Opmerkingen</u></th>
            <th className="px-4 py-2"><u>Telefoon</u></th>
            <th className="px-4 py-2"><u>Email</u></th>
            <th className="px-4 py-2"><u>Acties</u></th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => (
            <tr key={user.id}>
              <td
                className="px-4 py-2 cursor-pointer"
                onDoubleClick={() => handleEdit("full_name", user.full_name, user.id)}
              >
                {isEditing === user.id + "full_name" ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveEdit(user.id, "full_name")}
                    autoFocus
                  />
                ) : (
                  user.full_name
                )}
              </td>

              <td
                className="px-4 py-2 cursor-pointer"
                onDoubleClick={() => handleEdit("notes", user.notes || "", user.id)}
              >
                {isEditing === user.id + "notes" ? (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveEdit(user.id, "notes")}
                    autoFocus
                    rows={1}
                  />
                ) : (
                  user.notes || "Geen opmerkingen"
                )}
              </td>

              <td
                className="px-4 py-2 cursor-pointer"
                onDoubleClick={() => handleEdit("phone", user.phone, user.id)}
              >
                {isEditing === user.id + "phone" ? (
                  <input
                    type="tel"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveEdit(user.id, "phone")}
                    autoFocus
                  />
                ) : (
                  user.phone
                )}
              </td>

              <td
                className="px-4 py-2 cursor-pointer"
                onDoubleClick={() => handleEdit("email", user.email, user.id)}
              >
                {isEditing === user.id + "email" ? (
                  <input
                    type="email"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveEdit(user.id, "email")}
                    autoFocus
                  />
                ) : (
                  user.email
                )}
              </td>

              <td className="px-4 py-2">
                <button
                  onClick={() => handleDelete(user.id)}
                  className="bg-red-600 px-3 py-1 rounded-md hover:bg-red-700 delete-btn"
                >
                  Verwijder
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddUser}
      />
    </div>
  );
}