import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { useData } from '../context/DataContext';

interface CiudadAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
}

export function CiudadAutocomplete({ value, onChange, placeholder, id, required }: CiudadAutocompleteProps) {
  const { ciudadesCatalogo } = useData();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions when value changes (debounced)
  useEffect(() => {
    if (!value || value.trim().length < 3 || !showDropdown) {
      setSuggestions([]);
      return;
    }

    // 1. Search locally in ciudadesCatalogo first (instant)
    const normalizedVal = value.trim().toLowerCase();
    const localMatches = (ciudadesCatalogo || [])
      .filter((c) => c.activa && c.nombre.toLowerCase().includes(normalizedVal))
      .map((c) => c.nombre);

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        // 2. Query our backend proxy, avoiding client rate-limiting issues
        const response = await fetch(`/api/ciudades/buscar?q=${encodeURIComponent(value)}`);
        if (response.ok) {
          const apiResults: string[] = await response.json();
          
          // Combine local matches (with priority) and API results, removing duplicates
          const combined = Array.from(new Set([...localMatches, ...apiResults]));
          setSuggestions(combined);
        } else {
          // If API fails or is rate-limited, fall back to local matches
          setSuggestions(localMatches);
        }
      } catch (error) {
        console.error("Error fetching city suggestions from backend proxy:", error);
        setSuggestions(localMatches);
      } finally {
        setLoading(false);
      }
    }, 350); // Shorter debounce for snappier response

    return () => clearTimeout(delayDebounceFn);
  }, [value, showDropdown, ciudadesCatalogo]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full"
      />
      {showDropdown && (suggestions.length > 0 || loading) && (
        <ul className="absolute z-[999] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg max-h-60 overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
          {loading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500 animate-pulse">Buscando ciudades...</li>
          )}
          {suggestions.map((item, idx) => {
            const isLocal = (ciudadesCatalogo || []).some((c) => c.nombre.toLowerCase() === item.toLowerCase());
            return (
              <li
                key={idx}
                onClick={() => {
                  onChange(item);
                  setShowDropdown(false);
                }}
                className="px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors text-slate-800 dark:text-slate-100 flex justify-between items-center"
              >
                <span>{item}</span>
                {isLocal && (
                  <span className="text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">
                    Catálogo
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
