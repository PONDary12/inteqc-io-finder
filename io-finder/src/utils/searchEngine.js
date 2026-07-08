/**
 * I/O Finder — Search Engine
 * Searches across all I/O entries and groups results by equipment + cabinet.
 */

/**
 * Search equipment I/O data with priority-based matching.
 *
 * @param {string} query - Search query string
 * @param {object} ioData - The full io-data.json object
 * @param {string|null} locationFilter - Location ID to filter by, or null for all
 * @returns {Array} Array of result objects grouped by equipment code + cabinet
 */
export function searchEquipment(query, ioData, locationFilter) {
  if (!query || !ioData || !ioData.locations) return [];

  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) return [];

  // Collect all I/O entries with their location context
  const allEntries = [];
  for (const location of ioData.locations) {
    if (locationFilter && location.id !== locationFilter) continue;

    for (const cabinet of location.cabinets) {
      for (const io of cabinet.io) {
        allEntries.push({
          ...io,
          location: location.name,
          locationId: location.id,
          cabinet: cabinet.id,
        });
      }
    }
  }

  // Score each entry based on match quality
  const scoredEntries = [];
  for (const entry of allEntries) {
    const score = scoreMatch(entry, normalizedQuery);
    if (score > 0) {
      scoredEntries.push({ entry, score });
    }
  }

  // Sort by score (higher = better match)
  scoredEntries.sort((a, b) => b.score - a.score);

  // Group results by equipment code + cabinet
  const groupMap = new Map();
  for (const { entry, score } of scoredEntries) {
    const key = `${entry.equipmentCode}__${entry.cabinet}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        equipmentCode: entry.equipmentCode,
        equipmentName: entry.equipmentName,
        location: entry.location,
        locationId: entry.locationId,
        cabinet: entry.cabinet,
        diList: [],
        aiList: [],
        doList: [],
        aoList: [],
        bestScore: score,
      });
    }

    const group = groupMap.get(key);

    // Update best score
    if (score > group.bestScore) {
      group.bestScore = score;
    }

    // Categorize by I/O type
    const ioEntry = {
      seq: entry.seq,
      address: entry.address,
      signalName: entry.signalName,
      type: entry.type,
      drawingPage: entry.drawingPage,
      internalPage: entry.internalPage,
    };

    switch (entry.type) {
      case 'DI':
        group.diList.push(ioEntry);
        break;
      case 'AI':
        group.aiList.push(ioEntry);
        break;
      case 'DO':
        group.doList.push(ioEntry);
        break;
      case 'AO':
        group.aoList.push(ioEntry);
        break;
      default:
        // Unknown type — add to DI as fallback
        group.diList.push(ioEntry);
    }
  }

  // Convert to array, sort by best score, limit to 20
  const results = Array.from(groupMap.values())
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 20)
    .map(({ bestScore, ...rest }) => rest); // Remove bestScore from output

  // Sort I/O lists by sequence number within each result
  for (const result of results) {
    result.diList.sort((a, b) => a.seq - b.seq);
    result.aiList.sort((a, b) => a.seq - b.seq);
    result.doList.sort((a, b) => a.seq - b.seq);
    result.aoList.sort((a, b) => a.seq - b.seq);
  }

  return results;
}

/**
 * Score how well an I/O entry matches the query.
 * Higher score = better match.
 *
 * Priority:
 *   100 — Exact equipment code match
 *    80 — Partial equipment code match (starts with)
 *    70 — Partial equipment code match (contains)
 *    60 — Equipment name exact match
 *    50 — Equipment name starts with query
 *    40 — Equipment name contains query word
 *    30 — Exact address match
 *    20 — Signal name contains query
 *    10 — Any field partial match
 */
function scoreMatch(entry, query) {
  const code = (entry.equipmentCode || '').toLowerCase();
  const name = (entry.equipmentName || '').toLowerCase();
  const address = (entry.address || '').toLowerCase();
  const signal = (entry.signalName || '').toLowerCase();

  // Normalize by ignoring dots, underscores, hyphens, and spaces
  const normCode = code.replace(/[\._\-\s]/g, '');
  const normQuery = query.replace(/[\._\-\s]/g, '');

  // Exact equipment code match
  if (code === query) return 100;

  // Normalized equipment code match (e.g. V5_22 vs V5.22)
  if (normCode && normQuery && normCode === normQuery) return 95;

  // Equipment code starts with query
  if (code.startsWith(query)) return 80;

  // Normalized equipment code starts with query
  if (normCode && normQuery && normCode.startsWith(normQuery)) return 78;

  // Equipment code contains query
  if (code.includes(query)) return 70;

  // Normalized equipment code contains query
  if (normCode && normQuery && normCode.includes(normQuery)) return 68;

  // Equipment name exact match
  if (name === query) return 60;

  // Equipment name starts with query
  if (name.startsWith(query)) return 50;

  // Equipment name word match (any word starts with query)
  const nameWords = name.split(/\s+/);
  if (nameWords.some(word => word.startsWith(query))) return 45;

  // Equipment name contains query
  if (name.includes(query)) return 40;

  // Exact address match
  if (address === query) return 30;

  // Address contains query
  if (address.includes(query)) return 25;

  // Signal name contains query
  if (signal.includes(query)) return 20;

  return 0;
}

/**
 * Get search suggestions from the search index.
 *
 * @param {string} query - Partial search query
 * @param {Array} searchIndex - The search-index.json array
 * @param {number} maxResults - Maximum suggestions to return
 * @param {string|null} locationFilter - Location ID to filter by, or null for all
 * @returns {Array} Array of suggestion objects
 */
export function getSuggestions(query, searchIndex, maxResults = 8, locationFilter = null) {
  if (!query || !searchIndex || query.trim().length < 1) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const normQuery = normalizedQuery.replace(/[\._\-\s]/g, '');

  const scored = searchIndex
    .filter(item => {
      // Filter by location if specified
      if (locationFilter && item.locationId !== locationFilter) return false;
      return true;
    })
    .map(item => {
      const code = (item.code || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      const normCode = code.replace(/[\._\-\s]/g, '');

      let score = 0;
      if (code === normalizedQuery) score = 100;
      else if (normCode && normQuery && normCode === normQuery) score = 95; // Normalized match
      else if (code.startsWith(normalizedQuery)) score = 80;
      else if (normCode && normQuery && normCode.startsWith(normQuery)) score = 78; // Normalized starts with
      else if (code.includes(normalizedQuery)) score = 60;
      else if (normCode && normQuery && normCode.includes(normQuery)) score = 58; // Normalized contains
      else if (name === normalizedQuery) score = 55;
      else if (name.startsWith(normalizedQuery)) score = 50;
      else if (name.split(/\s+/).some(w => w.startsWith(normalizedQuery))) score = 40;
      else if (name.includes(normalizedQuery)) score = 30;
      else if (item.signals && item.signals.some(s => s.toLowerCase().includes(normalizedQuery))) score = 15;

      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored;
}
