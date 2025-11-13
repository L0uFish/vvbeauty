"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search } from "lucide-react";

export default function SearchBar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) params.set("q", term);
    else params.delete("q");
    router.push(`/admin/diensten?${params.toString()}`);
  }, 300);

  return (
    <div className="services-search-wrapper">
      <Search className="services-search-icon" size={18} />
      <input
        type="text"
        placeholder="Zoek diensten..."
        defaultValue={initialQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="services-search"
      />
    </div>
  );
}
