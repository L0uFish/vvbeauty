"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import "../../styles/UsersManager.css"; // Import the dedicated CSS file

export default function UsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]); // State to hold filtered users
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch users from Supabase
  const fetchUsers = async () => {
    const { data, error } = await supabase.from("clients").select("id, full_name, phone, email, notes");
    if (error) {
      console.error(error);
      return;
    }
    setUsers(data);
    setFilteredUsers(data); // Initially, display all users
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle filtering of users based on search query
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const lowercasedQuery = query.toLowerCase();
    const filtered = users.filter((user) => {
      return (
        user.full_name.toLowerCase().includes(lowercasedQuery) ||
        user.phone.toLowerCase().includes(lowercasedQuery) ||
        user.email.toLowerCase().includes(lowercasedQuery) ||
        (user.notes && user.notes.toLowerCase().includes(lowercasedQuery))
      );
    });
    setFilteredUsers(filtered);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      setUsers(users.filter((user) => user.id !== id));
      setFilteredUsers(filteredUsers.filter((user) => user.id !== id));
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleEdit = (field: string, value: string, userId: string) => {
    setIsEditing(userId + field);
    setEditValue(value);
  };

  const handleSaveEdit = async (userId: string, field: string) => {
    try {
      const updatedData = { [field]: editValue };

      const { error } = await supabase
        .from("clients")
        .update(updatedData)
        .eq("id", userId);

      if (error) throw error;
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, [field]: editValue } : user
        )
      );
      setFilteredUsers(
        filteredUsers.map((user) =>
          user.id === userId ? { ...user, [field]: editValue } : user
        )
      );
      setIsEditing(null);
    } catch (error) {
      console.error("Error saving edit:", error);
    }
  };

  return (
    <div className="table-container">
      {/* Search Bar */}
      <div className="search-container mb-4">
        <input
          type="text"
          placeholder="Zoeken naar gebruiker"
          className="search-input"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <table className="table-auto w-full">
        <thead>
          <tr>
            <th className="px-4 py-2"><u>Naam</u></th>
            <th className="px-4 py-2"><u>Opmerkingen</u></th>
            <th className="px-4 py-2"><u>Telefoon</u></th>
            <th className="px-4 py-2"><u>Email</u></th>
            <th className="px-4 py-2"><u>Verwijderen</u></th>
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
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveEdit(user.id, "notes")}
                    autoFocus
                  />
                ) : (
                  user.notes || "No notes"
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

              <td className="px-4 py-2 flex gap-2">
                <button
                  onClick={() => handleDelete(user.id)}
                  className="text-white bg-red-600 px-3 py-1 rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
