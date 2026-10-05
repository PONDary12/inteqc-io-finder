"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import WifiStatusWidget from "./components/WifiStatusWidget";
import WifiAccessModal from "./components/WifiAccessModal";

function normalizeCode(code, locId) {
  if (!code) return '';
  const s = String(code).trim().toLowerCase();
  if (locId === 'tower3') {
    return s.replace(/[\s\/\\]+/g, '');
  }
  return s.replace(/[\s_\-\/\\]+/g, '.');
}

const SUBDEVICE_SUFFIX_REGEX = /[\._](KM\d*|QF\d*|K\d*|ATS|KA\d*|KT\d*|BS\d*|BST\d*|BQS\d*|SKM\d*|YKM\d*|TA\d*|VF\d*|FR\d*|FU\d*|SA\d*|HL\d*|LL\d*|HA\d*|SQ\d*|SP\d*|ST\d*|BF\d*|BZSO\d*|PT\d*|TT\d*|LT\d*|QK\d*|SES\d*|PU\d*|YV\d*|SV\d*|AH\d*|F|[UVW]|[AB])$/i;

function stripSubdeviceSuffix(str) {
  if (!str) return '';
  let s = str;
  while (SUBDEVICE_SUFFIX_REGEX.test(s)) {
    s = s.replace(SUBDEVICE_SUFFIX_REGEX, '');
  }
  return s;
}

function findScadaAlternative(rawQuery, index) {
  if (!rawQuery || rawQuery.trim().length < 2) return null;
  const q = rawQuery.trim().toUpperCase();

  // If rawQuery already directly matches an equipment code in Tower 3, it is an authentic code (e.g. 11.24)
  const hasExactMatch = index.some(item => 
    item.locationId === 'tower3' && 
    item.code && 
    item.code.toUpperCase() === q
  );
  if (hasExactMatch) return null;

  const candidates = [];

  // 1. Dot to underscore (e.g. 5.89 -> 5_89, 10.36 -> 10_36, 2.90 -> 2_90)
  if (q.includes('.')) {
    candidates.push(q.replace(/\./g, '_'));
  }

  // 2. Underscore to dot (e.g. 1_3 -> 1.3, 1_21 -> 1.21)
  if (q.includes('_')) {
    candidates.push(q.replace(/_/g, '.'));
  }

  // 3. V6_4_46 -> V6.4_46 (replace first underscore between numbers with dot)
  if (/^[A-Z]*\d+_\d+_\d+/i.test(q)) {
    candidates.push(q.replace(/_/, '.'));
  }

  // 4. V6.4.46 -> V6.4_46 (replace second dot with underscore)
  if (/^[A-Z]*\d+\.\d+\.\d+/i.test(q)) {
    const parts = q.split('.');
    candidates.push(parts[0] + '.' + parts[1] + '_' + parts.slice(2).join('_'));
  }

  // 5. 3_8_VH1 -> 3.8_VH1
  if (/^\d+_\d+_[A-Z0-9]+/i.test(q)) {
    candidates.push(q.replace(/_/, '.'));
  }

  const uniqueCandidates = Array.from(new Set(candidates)).filter(c => c !== q);

  for (const cand of uniqueCandidates) {
    const match = index.find(item => 
      item.locationId === 'tower3' && 
      item.code && 
      item.code.toUpperCase() === cand
    );
    if (match) {
      return {
        original: rawQuery.trim(),
        suggested: match.code,
        name: match.name || ''
      };
    }
  }

  return null;
}

export default function SearchHome() {
  const router = useRouter();
  const [searchIndex, setSearchIndex] = useState([]);
  const [ioData, setIoData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [query, setQuery] = useState("");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMode, setActiveMode] = useState("search"); // "search" | "browse"
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [browseLocation, setBrowseLocation] = useState("");
  const [expandedCabinet, setExpandedCabinet] = useState(null);
  const [cabinetFilter, setCabinetFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const cabinetCardRefs = useRef({});

  // Load search index and full io data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [resIndex, resIoData] = await Promise.all([
          fetch("/data/search-index.json"),
          fetch("/data/io-data.json"),
        ]);
        const indexData = await resIndex.json();
        const fullData = await resIoData.json();
        setSearchIndex(indexData);
        setIoData(fullData);

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
        if (locs.length > 0) setBrowseLocation(locs[0].id);
      } catch (err) {
        console.error("Failed to load search index:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // Fetch server network IP and Wi-Fi configuration
    async function loadNetworkInfo() {
      try {
        const res = await fetch("/api/network-info");
        if (res.ok) {
          const data = await res.json();
          setNetworkInfo(data);
        }
      } catch (err) {
        console.warn("Could not load network info:", err);
      }
    }
    loadNetworkInfo();
  }, []);

  // Compute suggestions dynamically during render with relevance scoring
  const trimmedQuery = query.toLowerCase().trim();
  const cleanQ = trimmedQuery.replace(/^%/, '');

  const scoredItems = [];

  if (query.trim()) {
    for (const item of searchIndex) {
      if (selectedLocation !== "all" && item.locationId !== selectedLocation) {
        continue;
      }

      const itemCode = (item.code || '').toLowerCase();
      const itemNormCode = item.normalizedCode || '';
      const itemName = (item.name || '').toLowerCase();
      const itemNormQuery = normalizeCode(query, item.locationId);
      const itemNormCleanQ = normalizeCode(cleanQ, item.locationId);

      let score = 0;

      // 1. Exact match on Equipment Code (Top Priority: 10,000)
      if (itemCode === trimmedQuery || (itemNormCode && itemNormCode === itemNormQuery)) {
        score += 10000;
      }
      // 1b. Subdevice suffix match: typing "5_9.F" matches parent "5_9", "1_6_BQS" matches "1_6" (9,000)
      else if (stripSubdeviceSuffix(trimmedQuery) && stripSubdeviceSuffix(trimmedQuery) !== trimmedQuery) {
        const strippedQuery = stripSubdeviceSuffix(trimmedQuery);
        const strippedNormQuery = normalizeCode(strippedQuery, item.locationId);
        if (itemCode === strippedQuery || (itemNormCode && itemNormCode === strippedNormQuery)) {
          score += 9000;
        } else if (itemCode.startsWith(strippedQuery) || (itemNormCode && itemNormCode.startsWith(strippedNormQuery))) {
          score += 4500;
        }
      }
      // 1c. Match with all delimiters stripped e.g. typing "ag3101" matches "AG-3101" (8,000)
      else if (item.locationId !== 'tower3' && itemNormCode && itemNormQuery && itemNormCode.replace(/\./g, '') === itemNormQuery.replace(/\./g, '')) {
        score += 8000;
      }
      // 2. Code starts with query (5,000)
      else if (itemCode.startsWith(trimmedQuery) || (itemNormCode && itemNormCode.startsWith(itemNormQuery))) {
        score += 5000;
      }
      // 3. Code contains query (2,000)
      else if (itemNormCode && itemNormCode.includes(itemNormQuery)) {
        score += 2000;
      }

      // 4. Exact I/O Address Match (4,000)
      const hasExactAddr = item.addresses && item.addresses.some(a => {
        const cleanA = a.toLowerCase().replace(/^%/, '');
        return cleanA === cleanQ || normalizeCode(cleanA, item.locationId) === itemNormCleanQ;
      });
      if (hasExactAddr) {
        score += 4000;
      }

      // 5. Equipment Name matches
      if (itemName === trimmedQuery) {
        score += 3000;
      } else if (itemName.startsWith(trimmedQuery)) {
        score += 1500;
      } else if (itemName.includes(trimmedQuery)) {
        score += 800;
      }

      // 6. Address Prefix or Contains
      if (!hasExactAddr && item.addresses) {
        const hasAddrPrefix = item.addresses.some(a => {
          const cleanA = a.toLowerCase().replace(/^%/, '');
          return cleanA.startsWith(cleanQ);
        });
        if (hasAddrPrefix) {
          score += 1000;
        } else {
          const hasAddrContains = item.addresses.some(a => {
            const cleanA = a.toLowerCase().replace(/^%/, '');
            return cleanA.includes(cleanQ) || (itemNormCleanQ.length >= 3 && normalizeCode(cleanA, item.locationId).includes(itemNormCleanQ));
          });
          if (hasAddrContains) {
            score += 200;
          }
        }
      }

      // 7. Cabinet match
      if (item.cabinets && item.cabinets.some(c => c.toLowerCase().includes(trimmedQuery))) {
        score += 100;
      }

      if (score > 0) {
        scoredItems.push({ item, score });
      }
    }

    scoredItems.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const codeA = a.item.code || a.item.name || '';
      const codeB = b.item.code || b.item.name || '';
      return codeA.localeCompare(codeB, undefined, { numeric: true });
    });
  }

  const suggestions = scoredItems.slice(0, 8).map(s => s.item);

  const scadaAlternative = (selectedLocation === "tower3" || selectedLocation === "all") 
    ? findScadaAlternative(query, searchIndex) 
    : null;

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
    
    // Redirect to detail page of the highest scored suggestion
    if (suggestions.length > 0) {
      const bestMatch = suggestions[0];
      const codeParam = bestMatch.code || bestMatch.name || "GENERAL";
      router.push(`/machine/${bestMatch.locationId}/${encodeURIComponent(bestMatch.cabinets[0] || 'PLC')}/${encodeURIComponent(codeParam)}`);
    } else {
      // Fallback: If user entered subdevice suffix not directly matched (e.g. 5_9.F)
      const stripped = stripSubdeviceSuffix(trimmedQuery);
      if (stripped && stripped !== trimmedQuery) {
        const fallback = searchIndex.find(item => {
          const itemCode = (item.code || '').toLowerCase();
          return itemCode === stripped || (item.normalizedCode && item.normalizedCode === normalizeCode(stripped, item.locationId));
        });
        if (fallback) {
          const codeParam = fallback.code || fallback.name || "GENERAL";
          router.push(`/machine/${fallback.locationId}/${encodeURIComponent(fallback.cabinets[0] || 'PLC')}/${encodeURIComponent(codeParam)}`);
        }
      }
    }
  };

  const handleSelectSuggestion = (item) => {
    setQuery(item.code || item.name);
    setShowSuggestions(false);
    const codeParam = item.code || item.name || "GENERAL";
    router.push(`/machine/${item.locationId}/${encodeURIComponent(item.cabinets[0] || 'PLC')}/${encodeURIComponent(codeParam)}`);
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

  // Browse mode: compute cabinets for selected location with Natural Alphanumeric Sorting
  const browseCabinets = (() => {
    if (!ioData || !browseLocation) return [];
    const loc = ioData.locations.find(l => l.id === browseLocation);
    if (!loc) return [];
    
    let list = loc.cabinets.map(cab => {
      const equipSet = new Set();
      cab.io.forEach(p => {
        const key = p.equipmentCode || p.equipmentName || "";
        if (key) equipSet.add(key);
      });
      return {
        id: cab.id,
        name: cab.name,
        ioCount: cab.io.length,
        equipCount: equipSet.size,
        diCount: cab.io.filter(p => p.type === "DI").length,
        doCount: cab.io.filter(p => p.type === "DO").length,
        aiCount: cab.io.filter(p => p.type === "AI").length,
        aoCount: cab.io.filter(p => p.type === "AO").length,
      };
    });

    // Natural alphanumeric sorting: LCB_1, LCB_2, LCB_4 ... LCB_10 ... MCC2 ... MCC27
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    if (cabinetFilter.trim()) {
      const q = cabinetFilter.toLowerCase().trim();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }

    return list;
  })();

  // Browse mode: compute equipment for expanded cabinet with filtering and sorting
  const cabinetEquipment = (() => {
    if (!ioData || !browseLocation || !expandedCabinet) return [];
    const loc = ioData.locations.find(l => l.id === browseLocation);
    if (!loc) return [];
    const cab = loc.cabinets.find(c => c.id === expandedCabinet);
    if (!cab) return [];

    const equipMap = new Map();
    cab.io.forEach(p => {
      const key = p.equipmentCode || p.equipmentName || "GENERAL";
      if (!equipMap.has(key)) {
        equipMap.set(key, {
          code: p.equipmentCode,
          name: p.equipmentName,
          types: new Set(),
          signalCount: 0,
          cabinet: cab.name,
        });
      }
      const eq = equipMap.get(key);
      eq.types.add(p.type);
      eq.signalCount++;
    });

    let list = [...equipMap.values()]
      .map(eq => ({ ...eq, types: [...eq.types] }))
      .sort((a, b) => {
        const codeA = a.code || a.name || '';
        const codeB = b.code || b.name || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });

    if (equipmentFilter.trim()) {
      const q = equipmentFilter.toLowerCase().trim();
      list = list.filter(eq => 
        (eq.code && eq.code.toLowerCase().includes(q)) ||
        (eq.name && eq.name.toLowerCase().includes(q))
      );
    }

    return list;
  })();

  const handleToggleCabinet = (cabId) => {
    if (expandedCabinet === cabId) {
      setExpandedCabinet(null);
      setEquipmentFilter("");
    } else {
      setExpandedCabinet(cabId);
      setEquipmentFilter("");
      // Scroll into view smoothly after state update
      setTimeout(() => {
        const el = cabinetCardRefs.current[cabId];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

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

          {/* Factory Wi-Fi Access Widget */}
          <div style={styles.wifiWidgetContainer}>
            <WifiStatusWidget
              networkInfo={networkInfo}
              onOpenModal={() => setIsWifiModalOpen(true)}
            />
          </div>
        </header>

        {/* Main Panel */}
        <div style={styles.searchPanel}>
          {/* Mode Tabs */}
          <div style={styles.modeTabs}>
            <button
              style={{
                ...styles.modeTab,
                ...(activeMode === "search" ? styles.modeTabActive : {}),
              }}
              onClick={() => setActiveMode("search")}
            >
              🔍 Search
            </button>
            <button
              style={{
                ...styles.modeTab,
                ...(activeMode === "browse" ? styles.modeTabActive : {}),
              }}
              onClick={() => setActiveMode("browse")}
            >
              📂 Browse
            </button>
          </div>

          {/* ═══════════ SEARCH MODE ═══════════ */}
          {activeMode === "search" && (
            <div style={styles.searchModeContent}>
              {/* Location Dropdown */}
              <div style={styles.dropdownRow}>
                <span style={styles.dropdownIcon}>🏭</span>
                <select
                  style={styles.locationSelect}
                  value={selectedLocation}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value);
                    setActiveSuggestionIndex(-1);
                  }}
                >
                  <option value="all">All Towers</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
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
                    {suggestions.map((item, index) => {
                      const displayTitle = item.code || item.name || "General Signals";
                      const displaySubtitle = item.code 
                        ? (item.name || "Machine Circuit")
                        : (item.signals && item.signals.length > 0
                            ? `Signal: ${item.signals.slice(0, 2).join(', ')}`
                            : item.addresses && item.addresses.length > 0
                            ? `${item.types?.join('/') || 'I/O'} · ${item.addresses.slice(0, 3).join(', ')}${item.addresses.length > 3 ? ` (+${item.addresses.length - 3})` : ''}`
                            : "Circuit Signals");

                      return (
                        <div
                          key={`${item.code || item.name || 'gen'}-${item.locationId}-${index}`}
                          style={{
                            ...styles.suggestionItem,
                            ...(index === activeSuggestionIndex ? styles.suggestionItemActive : {}),
                          }}
                          onMouseDown={(e) => e.preventDefault()} // prevent blur
                          onClick={() => handleSelectSuggestion(item)}
                        >
                          <div style={styles.itemMeta}>
                            <span style={styles.itemCode}>{displayTitle}</span>
                            <span style={styles.itemName}>{displaySubtitle}</span>
                          </div>
                          <div style={styles.itemLocation}>
                            <span style={styles.itemCabinet}>🗄️ {item.cabinets.join(", ")}</span>
                            <span style={styles.itemLocationTag}>🏭 {item.location}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modern SaaS "Did you mean?" when 0 results found but a SCADA alternative exists */}
              {query && suggestions.length === 0 && scadaAlternative && (selectedLocation === "tower3" || selectedLocation === "all") && (
                <div style={styles.didYouMeanContainer}>
                  <div style={styles.didYouMeanLeft}>
                    <span style={styles.didYouMeanLabel}>Did you mean:</span>
                    <button
                      type="button"
                      style={styles.didYouMeanCodeTag}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery(scadaAlternative.suggested);
                        setShowSuggestions(true);
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      title={`Click to switch to ${scadaAlternative.suggested}`}
                    >
                      {scadaAlternative.suggested}
                    </button>
                    {scadaAlternative.name && (
                      <span style={styles.didYouMeanSubName}>({scadaAlternative.name})</span>
                    )}
                  </div>
                  <button
                    type="button"
                    style={styles.didYouMeanSwitchBtn}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQuery(scadaAlternative.suggested);
                      setShowSuggestions(true);
                      if (inputRef.current) inputRef.current.focus();
                    }}
                  >
                    <span>Switch to {scadaAlternative.suggested}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════ BROWSE MODE ═══════════ */}
          {activeMode === "browse" && (
            <div style={styles.browseModeContent}>
              {/* Tower Dropdown */}
              <div style={styles.dropdownRow}>
                <span style={styles.dropdownIcon}>🏭</span>
                <select
                  style={styles.locationSelect}
                  value={browseLocation}
                  onChange={(e) => {
                    setBrowseLocation(e.target.value);
                    setExpandedCabinet(null);
                    setCabinetFilter("");
                  }}
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              {/* Cabinet Filter Bar */}
              <div style={styles.cabinetSearchRow}>
                <div style={styles.filterInputWrapper}>
                  <span style={styles.filterSearchIcon}>🗄️</span>
                  <input
                    type="text"
                    style={styles.cabinetFilterInput}
                    placeholder="Search cabinet (e.g. MCC)..."
                    value={cabinetFilter}
                    onChange={(e) => setCabinetFilter(e.target.value)}
                  />
                  {cabinetFilter && (
                    <button style={styles.filterClearBtn} onClick={() => setCabinetFilter("")}>
                      ✕
                    </button>
                  )}
                </div>
                <div style={styles.cabinetCountBadge}>
                  {browseCabinets.length} Cabinet{browseCabinets.length > 1 ? "s" : ""}
                </div>
              </div>

              {/* Cabinet Cards Grid */}
              {isLoading ? (
                <div style={styles.browseLoading}>Loading plant data...</div>
              ) : (
                <div style={styles.cabinetGrid}>
                  {browseCabinets.map((cab, idx) => {
                    const isExpanded = expandedCabinet === cab.id;
                    return (
                      <div
                        key={`${cab.id}-${idx}`}
                        ref={(el) => (cabinetCardRefs.current[cab.id] = el)}
                        style={{
                          ...styles.cabinetWrapper,
                          gridColumn: isExpanded ? "1 / -1" : "auto",
                        }}
                      >
                        <button
                          style={{
                            ...styles.cabinetCard,
                            ...(isExpanded ? styles.cabinetCardExpanded : {}),
                          }}
                          onClick={() => handleToggleCabinet(cab.id)}
                        >
                          <div style={styles.cabinetCardHeader}>
                            <div style={styles.cabinetHeaderLeft}>
                              <span style={styles.cabinetIcon}>🗄️</span>
                              <span style={styles.cabinetName}>{cab.name}</span>
                            </div>
                            <span style={{
                              ...styles.expandArrowBadge,
                              ...(isExpanded ? styles.expandArrowBadgeActive : {}),
                              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            }}>
                              ▶
                            </span>
                          </div>
                          <div style={styles.cabinetStats}>
                            <div style={styles.statItem}>
                              <span style={styles.statValue}>{cab.equipCount}</span>
                              <span style={styles.statLabel}>Equipment</span>
                            </div>
                            <div style={styles.statDivider} />
                            <div style={styles.statItem}>
                              <span style={styles.statValue}>{cab.ioCount}</span>
                              <span style={styles.statLabel}>I/O Points</span>
                            </div>
                          </div>
                          <div style={styles.ioTypeBadges}>
                            {cab.diCount > 0 && <span style={styles.miniDI}>DI {cab.diCount}</span>}
                            {cab.doCount > 0 && <span style={styles.miniDO}>DO {cab.doCount}</span>}
                            {cab.aiCount > 0 && <span style={styles.miniAI}>AI {cab.aiCount}</span>}
                            {cab.aoCount > 0 && <span style={styles.miniAO}>AO {cab.aoCount}</span>}
                          </div>
                        </button>

                        {/* Equipment List (Accordion) */}
                        {isExpanded && (
                          <div style={styles.equipmentList}>
                            {/* In-Cabinet Equipment Search */}
                            <div style={styles.equipSearchHeader}>
                              <input
                                type="text"
                                style={styles.equipSearchInput}
                                placeholder={`Filter equipment in ${cab.name}...`}
                                value={equipmentFilter}
                                onChange={(e) => setEquipmentFilter(e.target.value)}
                              />
                              <span style={styles.equipCountTag}>
                                {cabinetEquipment.length} item{cabinetEquipment.length > 1 ? "s" : ""}
                              </span>
                            </div>

                            <div style={styles.equipScrollContainer}>
                              {cabinetEquipment.map((eq, idx) => {
                                const displayCode = eq.code || eq.name || "General Signals";
                                return (
                                  <button
                                    key={`${displayCode}-${idx}`}
                                    style={styles.equipmentRow}
                                    onClick={() => {
                                      const codeParam = eq.code || eq.name || "GENERAL";
                                      router.push(`/machine/${browseLocation}/${encodeURIComponent(cab.name)}/${encodeURIComponent(codeParam)}`);
                                    }}
                                  >
                                    <div style={styles.eqMeta}>
                                      <span style={styles.eqCode}>{displayCode}</span>
                                      {eq.code && eq.name && (
                                        <span style={styles.eqName}>{eq.name}</span>
                                      )}
                                    </div>
                                    <div style={styles.eqRight}>
                                      <span style={styles.eqSignals}>{eq.signalCount} signals</span>
                                      <div style={styles.eqTypes}>
                                        {eq.types.map(t => (
                                          <span key={t} style={{
                                            ...styles.eqTypeBadge,
                                            ...(t === "DI" ? styles.eqBadgeDI :
                                                t === "DO" ? styles.eqBadgeDO : styles.eqBadgeAnalog)
                                          }}>{t}</span>
                                        ))}
                                      </div>
                                      <span style={styles.eqArrow}>→</span>
                                    </div>
                                  </button>
                                );
                              })}
                              {cabinetEquipment.length === 0 && (
                                <div style={styles.noEquipment}>
                                  {equipmentFilter ? "No matching equipment found." : "No equipment found in this cabinet."}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {browseCabinets.length === 0 && (
                    <div style={styles.noCabinets}>
                      No cabinets match &quot;{cabinetFilter}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Factory Wi-Fi QR Access Modal */}
      <WifiAccessModal
        isOpen={isWifiModalOpen}
        onClose={() => setIsWifiModalOpen(false)}
        networkInfo={networkInfo}
      />
    </div>
  );
}

const styles = {
  wifiWidgetContainer: {
    display: "flex",
    justifyContent: "center",
    marginTop: "6px",
    width: "100%",
  },
  container: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100dvh",
    height: "100%",
    width: "100%",
    padding: "20px 16px 80px",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    boxSizing: "border-box",
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
    maxWidth: "860px",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    animation: "fadeIn 0.4s ease",
    paddingTop: "20px",
    paddingBottom: "80px",
    boxSizing: "border-box",
  },
  header: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
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
    fontSize: "32px",
    fontWeight: "800",
    color: "var(--text-main)",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "15px",
    color: "var(--text-muted)",
    maxWidth: "520px",
    lineHeight: "1.5",
  },
  searchPanel: {
    background: "var(--bg-card)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-premium)",
    padding: "0",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },

  // ── Mode Tabs ──
  modeTabs: {
    display: "flex",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border-color)",
    borderTopLeftRadius: "var(--radius-lg)",
    borderTopRightRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  modeTab: {
    flex: 1,
    padding: "14px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-muted)",
    background: "transparent",
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  modeTabActive: {
    color: "var(--primary)",
    borderBottomColor: "var(--primary)",
    background: "var(--primary-light)",
  },

  // ── Search Mode ──
  searchModeContent: {
    padding: "20px 24px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    position: "relative",
  },

  // ── Dropdown Row ──
  dropdownRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dropdownIcon: {
    fontSize: "18px",
    flexShrink: 0,
  },
  locationSelect: {
    flex: 1,
    height: "44px",
    padding: "0 36px 0 12px",
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-main)",
    background: "var(--bg-main)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    transition: "border-color var(--transition-fast)",
  },

  // ── Search Input ──
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
    height: "52px",
    background: "var(--bg-main)",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
    borderRadius: "var(--radius-md)",
    paddingLeft: "48px",
    paddingRight: "48px",
    fontSize: "16px",
    fontWeight: "500",
    color: "var(--text-main)",
    transition: "all var(--transition-fast)",
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

  // ── Suggestions ──
  suggestionsList: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    background: "#ffffff",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-lg)",
    maxHeight: "360px",
    overflowY: "auto",
    zIndex: 1000,
    animation: "slideUp 0.15s ease",
  },
  suggestionItem: {
    padding: "16px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border-color)",
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

  // ── Modern SaaS "Did you mean?" (Linear / Vercel Red & White Theme) ──
  didYouMeanContainer: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "9px 16px",
    marginTop: "10px",
    background: "linear-gradient(135deg, #ffffff 0%, #fffbfb 100%)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#fee2e2",
    borderRadius: "12px",
    boxShadow: "0 4px 16px -2px rgba(204, 17, 17, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)",
    animation: "fadeIn 0.2s ease",
  },
  didYouMeanLeft: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    flexWrap: "wrap",
  },
  didYouMeanLabel: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#64748b",
  },
  didYouMeanCodeTag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 9px",
    background: "#fef2f2",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#fca5a5",
    borderRadius: "6px",
    fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace",
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#cc1111",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(204, 17, 17, 0.06)",
    transition: "all var(--transition-fast)",
  },
  didYouMeanSubName: {
    fontSize: "12.5px",
    fontWeight: "400",
    color: "#94a3b8",
  },
  didYouMeanSwitchBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 14px",
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#ffffff",
    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(185, 28, 28, 0.8)",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.28)",
    transition: "all var(--transition-fast)",
    whiteSpace: "nowrap",
  },

  // ═══════════ BROWSE MODE ═══════════
  browseModeContent: {
    padding: "20px 16px 28px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
    boxSizing: "border-box",
  },
  browseLoading: {
    textAlign: "center",
    padding: "40px",
    color: "var(--text-muted)",
    fontSize: "14px",
  },
  cabinetSearchRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    justifyContent: "space-between",
    width: "100%",
    boxSizing: "border-box",
  },
  filterInputWrapper: {
    position: "relative",
    flex: 1,
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  filterSearchIcon: {
    position: "absolute",
    left: "12px",
    fontSize: "14px",
    color: "var(--text-light)",
  },
  cabinetFilterInput: {
    width: "100%",
    height: "38px",
    background: "var(--bg-main)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
    borderRadius: "var(--radius-sm)",
    paddingLeft: "36px",
    paddingRight: "36px",
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--text-main)",
    boxSizing: "border-box",
  },
  filterClearBtn: {
    position: "absolute",
    right: "10px",
    background: "transparent",
    border: "none",
    fontSize: "12px",
    color: "var(--text-light)",
    cursor: "pointer",
  },
  cabinetCountBadge: {
    fontSize: "12px",
    fontWeight: "700",
    color: "var(--text-muted)",
    background: "var(--bg-main)",
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  // ── Cabinet Grid (Responsive 2-Column on Desktop, 1-Column on Mobile) ──
  cabinetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
    gap: "12px",
    alignItems: "start",
    width: "100%",
    boxSizing: "border-box",
  },
  cabinetWrapper: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    transition: "all var(--transition-fast)",
  },
  cabinetCard: {
    width: "100%",
    boxSizing: "border-box",
    textAlign: "left",
    background: "var(--bg-main)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
    borderTopLeftRadius: "var(--radius-md)",
    borderTopRightRadius: "var(--radius-md)",
    borderBottomLeftRadius: "var(--radius-md)",
    borderBottomRightRadius: "var(--radius-md)",
    padding: "16px",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  cabinetCardExpanded: {
    borderColor: "var(--primary)",
    background: "var(--primary-light)",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    boxShadow: "var(--shadow-sm)",
  },
  cabinetCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    width: "100%",
  },
  cabinetHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    minWidth: 0,
  },
  cabinetIcon: {
    fontSize: "18px",
    flexShrink: 0,
  },
  cabinetName: {
    fontSize: "15px",
    fontWeight: "700",
    color: "var(--text-main)",
    letterSpacing: "-0.2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  expandArrowBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    borderRadius: "var(--radius-full)",
    background: "rgba(148, 163, 184, 0.15)",
    fontSize: "9px",
    color: "var(--text-muted)",
    flexShrink: 0,
    transition: "all var(--transition-fast)",
  },
  expandArrowBadgeActive: {
    background: "var(--primary)",
    color: "#ffffff",
  },
  cabinetStats: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "10px 14px",
    background: "var(--bg-card)",
    borderRadius: "var(--radius-sm)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
  },
  statItem: {
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
  },
  statValue: {
    fontSize: "16px",
    fontWeight: "800",
    color: "var(--text-main)",
  },
  statLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statDivider: {
    width: "1px",
    height: "16px",
    background: "var(--border-color)",
  },
  ioTypeBadges: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  miniDI: {
    fontSize: "10px",
    fontWeight: "700",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "var(--accent-green)",
    background: "rgba(16, 185, 129, 0.1)",
  },
  miniDO: {
    fontSize: "10px",
    fontWeight: "700",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "var(--primary)",
    background: "rgba(204, 17, 17, 0.06)",
  },
  miniAI: {
    fontSize: "10px",
    fontWeight: "700",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "var(--accent-blue)",
    background: "rgba(2, 132, 199, 0.1)",
  },
  miniAO: {
    fontSize: "10px",
    fontWeight: "700",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "var(--accent-yellow)",
    background: "rgba(245, 158, 11, 0.1)",
  },

  // ── Equipment List (Accordion) ──
  equipmentList: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--primary)",
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: "var(--radius-md)",
    borderBottomRightRadius: "var(--radius-md)",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "var(--shadow-md)",
    animation: "slideUp 0.15s ease",
  },
  equipSearchHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    background: "#f8fafc",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border-color)",
  },
  equipSearchInput: {
    flex: 1,
    height: "32px",
    background: "#ffffff",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "0 10px",
    fontSize: "12px",
    fontWeight: "500",
    color: "var(--text-main)",
  },
  equipCountTag: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
  },
  equipScrollContainer: {
    maxHeight: "360px",
    overflowY: "auto",
  },
  equipmentRow: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "transparent",
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border-color)",
    cursor: "pointer",
    transition: "background var(--transition-fast)",
    textAlign: "left",
    gap: "8px",
  },
  eqMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
    minWidth: 0,
  },
  eqCode: {
    fontSize: "14px",
    fontWeight: "700",
    color: "var(--text-main)",
  },
  eqName: {
    fontSize: "12px",
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  eqRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
  },
  eqSignals: {
    fontSize: "12px",
    fontWeight: "500",
    color: "var(--text-light)",
    whiteSpace: "nowrap",
  },
  eqTypes: {
    display: "flex",
    gap: "3px",
  },
  eqTypeBadge: {
    fontSize: "9px",
    fontWeight: "700",
    padding: "2px 5px",
    borderRadius: "3px",
  },
  eqBadgeDI: {
    color: "var(--accent-green)",
    background: "rgba(16, 185, 129, 0.1)",
  },
  eqBadgeDO: {
    color: "var(--primary)",
    background: "rgba(204, 17, 17, 0.06)",
  },
  eqBadgeAnalog: {
    color: "var(--accent-blue)",
    background: "rgba(2, 132, 199, 0.1)",
  },
  eqArrow: {
    fontSize: "14px",
    color: "var(--primary)",
    fontWeight: "700",
  },
  noEquipment: {
    padding: "24px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: "13px",
  },
  noCabinets: {
    gridColumn: "1 / -1",
    padding: "36px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: "14px",
    background: "var(--bg-main)",
    borderRadius: "var(--radius-md)",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: "var(--border-color)",
  },
};
