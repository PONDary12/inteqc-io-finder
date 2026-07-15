"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

function normalizeCode(code) {
  if (!code) return '';
  return String(code)
    .trim()
    .toLowerCase()
    .replace(/[_\-]/g, '.');
}

export default function SearchHome() {
  const router = useRouter();
  const [searchIndex, setSearchIndex] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [query, setQuery] = useState("");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Load search index data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const resIndex = await fetch("/data/search-index.json");
        const indexData = await resIndex.json();
        setSearchIndex(indexData);

        // Extract unique locations from index
        const locs = [];
        const locIds = new Set();
        indexData.forEach(item => {
          if (item.locationId && !locIds.has(item.locationId)) {
            locIds.add(item.locationId);
            locs.push({ id: item.locationId, name: item.location });
          }
        });
        setLocations(locs);
      } catch (err) {
        console.error("Failed to load search index:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute suggestions dynamically during render
  const trimmedQuery = query.toLowerCase().trim();
  const normalizedQuery = normalizeCode(query);
  const filtered = query.trim() ? searchIndex.filter(item => {
    // Location filter
    if (selectedLocation !== "all" && item.locationId !== selectedLocation) {
      return false;
    }
    
    // Search matches code or name
    const codeMatch = item.normalizedCode && item.normalizedCode.includes(normalizedQuery);
    const nameMatch = item.name && item.name.toLowerCase().includes(trimmedQuery);
    const cabMatch = item.cabinets && item.cabinets.some(c => c.toLowerCase().includes(trimmedQuery));
    
    return codeMatch || nameMatch || cabMatch;
  }) : [];

  const suggestions = filtered.slice(0, 8);

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    
    // Find exact match in code
    const exactCodeMatch = searchIndex.find(
      item => item.normalizedCode === normalizeCode(query)
    );
    if (exactCodeMatch) {
      router.push(`/machine/${exactCodeMatch.locationId}/${exactCodeMatch.cabinets[0]}/${exactCodeMatch.code}`);
      return;
    }

    // Otherwise redirect to detail page of the first matched suggestion
    if (suggestions.length > 0) {
      const bestMatch = suggestions[0];
      router.push(`/machine/${bestMatch.locationId}/${bestMatch.cabinets[0]}/${bestMatch.code}`);
    }
  };

  const handleSelectSuggestion = (item) => {
    setQuery(item.code || item.name);
    setShowSuggestions(false);
    router.push(`/machine/${item.locationId}/${item.cabinets[0]}/${item.code}`);
  };

  // Scroll active suggestion into view
  useEffect(() => {
    if (activeSuggestionIndex >= 0 && suggestionsRef.current) {
      const activeEl = suggestionsRef.current.children[activeSuggestionIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [activeSuggestionIndex]);

  return (
    <div style={styles.container}>
      {/* Curved glowing top background */}
      <div style={styles.glowBg} />

      <div style={styles.content}>
        {/* Header Block */}
        <header style={styles.header}>
          <div style={styles.logoBadge}>I/O</div>
          <h1 style={styles.title}>INTEQC I/O Finder</h1>
          <p style={styles.subtitle}>
            Enter machine code, name, or I/O address to view circuit drawings instantly.
          </p>
        </header>

        {/* Search Panel */}
        <div style={styles.searchPanel}>
          {/* Breadcrumb / Location Filter */}
          <div style={styles.filterBar}>
            <button
              style={{
                ...styles.filterBtn,
                ...(selectedLocation === "all" ? styles.filterBtnActive : {}),
              }}
              onClick={() => {
                setSelectedLocation("all");
                setActiveSuggestionIndex(-1);
              }}
            >
              📍 All Towers
            </button>
            {locations.map(loc => (
              <button
                key={loc.id}
                style={{
                  ...styles.filterBtn,
                  ...(selectedLocation === loc.id ? styles.filterBtnActive : {}),
                }}
                onClick={() => {
                  setSelectedLocation(loc.id);
                  setActiveSuggestionIndex(-1);
                }}
              >
                🏭 {loc.name}
              </button>
            ))}
          </div>

          {/* Search Input Container */}
          <div style={styles.inputWrapper}>
            <div style={styles.searchIcon}>🔍</div>
            <input
              ref={inputRef}
              type="text"
              style={styles.input}
              placeholder={isLoading ? "Loading index..." : "Search machine code, name (e.g. V6.4_2, Silo)..."}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
                setActiveSuggestionIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay to allow clicking suggestions
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              disabled={isLoading}
            />
            {query && (
              <button style={styles.clearBtn} onClick={() => setQuery("")}>
                ✕
              </button>
            )}

            {/* Autocomplete dropdown suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={styles.suggestionsList} ref={suggestionsRef}>
                {suggestions.map((item, index) => (
                  <div
                    key={`${item.code}-${item.locationId}-${index}`}
                    style={{
                      ...styles.suggestionItem,
                      ...(index === activeSuggestionIndex ? styles.suggestionItemActive : {}),
                    }}
                    onMouseDown={(e) => e.preventDefault()} // prevent blur
                    onClick={() => handleSelectSuggestion(item)}
                  >
                    <div style={styles.itemMeta}>
                      <span style={styles.itemCode}>{item.code || "N/A"}</span>
                      <span style={styles.itemName}>{item.name}</span>
                    </div>
                    <div style={styles.itemLocation}>
                      <span style={styles.itemCabinet}>🗄️ {item.cabinets.join(", ")}</span>
                      <span style={styles.itemLocationTag}>🏭 {item.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
    width: "100%",
    padding: "24px",
    overflowY: "auto",
  },
  glowBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "360px",
    background: "linear-gradient(180deg, rgba(204,17,17,0.06) 0%, rgba(248,250,252,0) 100%)",
    zIndex: 0,
    pointerEvents: "none",
  },
  content: {
    width: "100%",
    maxWidth: "800px",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "36px",
    animation: "fadeIn 0.4s ease",
  },
  header: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  logoBadge: {
    background: "var(--primary)",
    color: "#ffffff",
    fontWeight: "800",
    fontSize: "14px",
    padding: "4px 12px",
    borderRadius: "var(--radius-full)",
    letterSpacing: "1px",
    boxShadow: "0 4px 12px rgba(204,17,17,0.2)",
  },
  title: {
    fontSize: "36px",
    fontWeight: "800",
    color: "var(--text-main)",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "16px",
    color: "var(--text-muted)",
    maxWidth: "500px",
    lineHeight: "1.5",
  },
  searchPanel: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-premium)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  filterBar: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  filterBtn: {
    background: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  filterBtnActive: {
    background: "var(--primary-light)",
    borderColor: "var(--primary)",
    color: "var(--primary)",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "16px",
    fontSize: "18px",
    color: "var(--text-light)",
  },
  input: {
    width: "100%",
    height: "56px",
    background: "var(--bg-main)",
    border: "2px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    paddingLeft: "48px",
    paddingRight: "48px",
    fontSize: "16px",
    fontWeight: "500",
    color: "var(--text-main)",
    transition: "all var(--transition-fast)",
  },
  inputFocus: {
    borderColor: "var(--primary)",
    background: "#ffffff",
    boxShadow: "0 0 0 4px rgba(204,17,17,0.08)",
  },
  clearBtn: {
    position: "absolute",
    right: "16px",
    background: "transparent",
    border: "none",
    fontSize: "14px",
    color: "var(--text-light)",
    cursor: "pointer",
  },
  suggestionsList: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    background: "#ffffff",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-lg)",
    maxHeight: "360px",
    overflowY: "auto",
    zIndex: 100,
    animation: "slideUp 0.15s ease",
  },
  suggestionItem: {
    padding: "16px",
    borderBottom: "1px solid var(--border-color)",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "all var(--transition-fast)",
  },
  suggestionItemActive: {
    background: "var(--primary-light)",
  },
  itemMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  itemCode: {
    fontSize: "15px",
    fontWeight: "700",
    color: "var(--text-main)",
  },
  itemName: {
    fontSize: "13px",
    color: "var(--text-muted)",
  },
  itemLocation: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "4px",
  },
  itemCabinet: {
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--text-muted)",
  },
  itemLocationTag: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--primary)",
    background: "var(--primary-light)",
    padding: "2px 8px",
    borderRadius: "var(--radius-full)",
  },
  quickGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
  },
  quickCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  cardIcon: {
    fontSize: "24px",
    color: "var(--primary)",
  },
};
