"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";

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

function normalizeAddress(addr) {
  if (!addr) return '';
  return String(addr)
    .trim()
    .toLowerCase()
    .replace(/[_\-]/g, '.')
    .replace(/o/g, '0');
}

function compareAddresses(addrA, addrB) {
  if (!addrA && !addrB) return 0;
  if (!addrA) return 1;
  if (!addrB) return -1;
  
  const cleanA = String(addrA).trim().toUpperCase();
  const cleanB = String(addrB).trim().toUpperCase();

  const matchA = cleanA.match(/^([A-Z]+)?(\d+)(?:\.(\d+))?$/);
  const matchB = cleanB.match(/^([A-Z]+)?(\d+)(?:\.(\d+))?$/);

  if (matchA && matchB) {
    const prefixA = matchA[1] || '';
    const prefixB = matchB[1] || '';

    if (prefixA !== prefixB) {
      const order = { 'I': 1, 'Q': 2, 'IW': 3, 'PIW': 4, 'QW': 5, 'PQW': 6 };
      const rankA = order[prefixA] || 99;
      const rankB = order[prefixB] || 99;
      if (rankA !== rankB) return rankA - rankB;
      return prefixA.localeCompare(prefixB);
    }

    const byteA = parseInt(matchA[2], 10);
    const byteB = parseInt(matchB[2], 10);
    if (byteA !== byteB) return byteA - byteB;

    const bitA = matchA[3] !== undefined ? parseInt(matchA[3], 10) : 0;
    const bitB = matchB[3] !== undefined ? parseInt(matchB[3], 10) : 0;
    return bitA - bitB;
  }

  return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
}

export default function MachineDetail({ params }) {
  const router = useRouter();
  
  // Resolve params using React 19 use()
  const resolvedParams = use(params);
  const locationId = resolvedParams.locationId;
  const cabinet = resolvedParams.cabinet ? decodeURIComponent(resolvedParams.cabinet) : "";
  const equipmentCode = resolvedParams.equipmentCode ? decodeURIComponent(resolvedParams.equipmentCode) : "";

  const [ioData, setIoData] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [allLocationEquipments, setAllLocationEquipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, DI, DO, Analog
  const [mobileView, setMobileView] = useState("table"); // table, drawing

  // Set page title dynamically
  useEffect(() => {
    if (equipment) {
      document.title = `${equipment.displayTitle || equipment.code || equipment.name} | INTEQC I/O Finder`;
    } else if (equipmentCode) {
      document.title = `${equipmentCode} | INTEQC I/O Finder`;
    }
  }, [equipment, equipmentCode]);
  
  // Drawing states
  const [currentDrawing, setCurrentDrawing] = useState(null); // { cabinet, page, internalPage, drawingPdfUrl }
  const [allDrawings, setAllDrawings] = useState([]);

  // Zoom/Pan States
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStartDist, setTouchStartDist] = useState(0);

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Load I/O data on mount
  useEffect(() => {
    const matchEquip = (point, paramCode) => {
      if (!point || !paramCode) return false;
      const normParam = paramCode.trim().toLowerCase();
      const pCode = point.equipmentCode ? point.equipmentCode.trim().toLowerCase() : '';
      const pName = point.equipmentName ? point.equipmentName.trim().toLowerCase() : '';

      // 1. Direct code matches
      if (pCode) {
        if (pCode === normParam) return true;
        if (pCode.startsWith(normParam + ':') || normParam.startsWith(pCode + ':')) return true;
        if (normalizeCode(pCode, locationId) === normalizeCode(normParam, locationId)) return true;

        // Subdevice suffix matches (e.g. paramCode '5_9.f' matches point '5_9', or point '1_6_bqs' matches '1_6')
        const strippedParam = stripSubdeviceSuffix(normParam);
        const strippedPoint = stripSubdeviceSuffix(pCode);
        if (strippedParam && (pCode === strippedParam || normalizeCode(pCode, locationId) === normalizeCode(strippedParam, locationId))) return true;
        if (strippedPoint && (strippedPoint === normParam || normalizeCode(strippedPoint, locationId) === normalizeCode(normParam, locationId))) return true;
        if (strippedParam && strippedPoint && normalizeCode(strippedPoint, locationId) === normalizeCode(strippedParam, locationId)) return true;
      }

      // 2. Direct name matches (for points without code or navigated by name)
      if (pName) {
        if (pName === normParam) return true;
        if (pName.startsWith(normParam + ':') || normParam.startsWith(pName + ':')) return true;
        if (normalizeCode(pName, locationId) === normalizeCode(normParam, locationId)) return true;
      }

      // 3. Fallback for "GENERAL" / "SPARE"
      if ((normParam === 'general' || normParam === 'spare') && !pCode) {
        return true;
      }

      return false;
    };

    async function loadData() {
      setIsLoading(true);
      setNotFound(false);
      try {
        const res = await fetch("/data/io-data.json");
        const data = await res.json();
        setIoData(data);

        // Find location
        const location = data.locations.find(l => l.id === locationId);
        if (!location) {
          setNotFound(true);
          return;
        }

        // Collect all unique equipments in this location for sidebar navigation
        const equipMap = new Map();
        location.cabinets.forEach(cab => {
          cab.io.forEach(point => {
            const key = point.equipmentCode || point.equipmentName || "General Signals";
            if (!equipMap.has(key)) {
              equipMap.set(key, {
                code: point.equipmentCode || "",
                name: point.equipmentName || (point.equipmentCode ? "" : "General Signals"),
                cabinet: point.cabinet,
                param: point.equipmentCode || point.equipmentName || "GENERAL"
              });
            }
          });
        });
        setAllLocationEquipments(Array.from(equipMap.values()));

        // Find the selected equipment points in the location
        const points = [];
        const drawingsSet = new Map();

        // 1. Gather all schematic drawings registered for this equipment code in equipmentDrawings
        const cleanParamCode = equipmentCode ? equipmentCode.trim().toUpperCase().replace(/-/g, '_') : '';
        
        // Helper to extract MCC lineup identifier (e.g. "MCCB13-RI31" -> "MCCB13", "MCC5_6" -> "MCC56")
        const extractMcc = (cabStr) => {
          if (!cabStr) return null;
          const m = cabStr.match(/^(MCC(?:B)?\d+(?:[_\-]\d+)?)/i);
          return m ? m[1].toUpperCase().replace(/[_\-]/g, '') : null;
        };
        const currentMcc = extractMcc(cabinet);

        const getMachineRoot = (name) => {
          if (!name) return '';
          const clean = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          return clean.split(/\s+/)[0] || '';
        };

        const areNamesCompatible = (nameA, nameB) => {
          if (!nameA || !nameB) return true;
          const rootA = getMachineRoot(nameA);
          const rootB = getMachineRoot(nameB);
          if (!rootA || !rootB) return true;
          if (rootA === rootB) return true;
          if (rootA.length >= 4 && rootB.startsWith(rootA)) return true;
          if (rootB.length >= 4 && rootA.startsWith(rootB)) return true;
          return false;
        };

        // In Tower 3, determine the machine root identity from the active cabinet route
        let routeRoot = '';
        if (locationId === 'tower3') {
          const routeCab = location.cabinets.find(c => c.name === cabinet);
          if (routeCab) {
            const matchPoint = routeCab.io.find(p => {
              const pCode = (p.equipmentCode || '').trim().toLowerCase();
              const normEq = equipmentCode.trim().toLowerCase();
              const strippedEq = stripSubdeviceSuffix(normEq);
              return pCode === normEq ||
                     normalizeCode(pCode, locationId) === normalizeCode(normEq, locationId) ||
                     (strippedEq && (pCode === strippedEq || normalizeCode(pCode, locationId) === normalizeCode(strippedEq, locationId)));
            });
            if (matchPoint && matchPoint.equipmentName) {
              routeRoot = getMachineRoot(matchPoint.equipmentName);
            }
          }
        }

        // Safe sub-unit / actuator suffix matcher (requires digits in base code to prevent pure-alpha "AG" matching "AG_3101")
        const isActuatorSuffix = (str, base) => {
          if (!/\d/.test(base)) return false;
          if (!str.startsWith(base + '_') && !str.startsWith(base + '.') && !str.startsWith(base + '-')) return false;
          const suffix = str.slice(base.length);
          return SUBDEVICE_SUFFIX_REGEX.test(suffix);
        };

        if (location.equipmentDrawings) {
          const strippedParamCode = stripSubdeviceSuffix(cleanParamCode);
          const parentParamCode = (cleanParamCode.endsWith('0') && cleanParamCode.length > 2) ? cleanParamCode.slice(0, -1) : null;
          for (const [eqKey, sheets] of Object.entries(location.equipmentDrawings)) {
            const cleanKey = eqKey.trim().toUpperCase().replace(/-/g, '_');
            const strippedKey = stripSubdeviceSuffix(cleanKey);
            const isMatch = cleanKey === cleanParamCode ||
                            (strippedParamCode && cleanKey === strippedParamCode) ||
                            (strippedKey && strippedKey === cleanParamCode) ||
                            (strippedParamCode && strippedKey && strippedKey === strippedParamCode) ||
                            (parentParamCode && (cleanKey === parentParamCode || strippedKey === parentParamCode)) ||
                            normalizeCode(cleanKey, locationId) === normalizeCode(cleanParamCode, locationId) ||
                            (strippedParamCode && normalizeCode(cleanKey, locationId) === normalizeCode(strippedParamCode, locationId)) ||
                            (parentParamCode && normalizeCode(cleanKey, locationId) === normalizeCode(parentParamCode, locationId)) ||
                            isActuatorSuffix(cleanParamCode, cleanKey) ||
                            isActuatorSuffix(cleanKey, cleanParamCode);
            if (isMatch && Array.isArray(sheets)) {
              sheets.forEach(s => {
                if (locationId === 'tower3') {
                  const sheetMcc = extractMcc(s.cabinet);
                  if (currentMcc && sheetMcc && currentMcc !== sheetMcc) {
                    const sheetCab = location.cabinets.find(c => c.name === s.cabinet);
                    let sheetRoot = '';
                    if (sheetCab) {
                      const sp = sheetCab.io.find(p => {
                        const pCode = (p.equipmentCode || '').trim().toLowerCase();
                        const normEq = equipmentCode.trim().toLowerCase();
                        const strippedEq = stripSubdeviceSuffix(normEq);
                        return pCode === normEq ||
                               normalizeCode(pCode, locationId) === normalizeCode(normEq, locationId) ||
                               (strippedEq && (pCode === strippedEq || normalizeCode(pCode, locationId) === normalizeCode(strippedEq, locationId)));
                      });
                      if (sp && sp.equipmentName) sheetRoot = getMachineRoot(sp.equipmentName);
                    }
                    if (routeRoot && sheetRoot && !areNamesCompatible(routeRoot, sheetRoot)) {
                      return;
                    }
                  }
                }

                // Exclude layout sheets and terminal schedule tables (.a, .b sheets or type === 'terminal')
                if (s.type === 'layout' || s.type === 'terminal' || /\.[a-z]$/i.test(s.internalPage || '')) {
                  return;
                }

                const key = s.drawingPdfUrl || (s.internalPage ? `sheet-${s.internalPage}` : `${s.cabinet || cabinet}-${s.page}`);
                if (!drawingsSet.has(key)) {
                  drawingsSet.set(key, {
                    cabinet: s.cabinet || cabinet,
                    page: s.page,
                    internalPage: s.internalPage,
                    drawingPdfUrl: s.drawingPdfUrl,
                    label: s.label || 'Schematic Diagram',
                    type: s.type || 'schematic'
                  });
                }
              });
            }
          }
        }

        // 2. Also map drawings from matching I/O points (e.g. PLC cards / rack overview)
        location.cabinets.forEach(cab => {
          cab.io.forEach(point => {
            if (matchEquip(point, equipmentCode)) {
              if (locationId === 'tower3') {
                const pointMcc = extractMcc(point.cabinet || cab.name);
                if (currentMcc && pointMcc && currentMcc !== pointMcc) {
                  const pRoot = getMachineRoot(point.equipmentName);
                  if (routeRoot && pRoot && !areNamesCompatible(routeRoot, pRoot)) {
                    return;
                  }
                }
              }

              points.push(point);
              
              if (point.drawingPdfUrl && point.drawingPage) {
                // Exclude terminal schedule tables (.a, .b sheets)
                const isTerminalSchedule = /\.[a-z]$/i.test(point.internalPage || '') || (point.internalPage || '').toLowerCase().includes('.a') || (point.internalPage || '').toLowerCase().includes('.b');
                if (isTerminalSchedule) return;

                // Lookup genuine classification label and type from location.equipmentDrawings if available
                let pointLabel = 'PLC I/O Wiring';
                let pointType = 'control';
                if (location.equipmentDrawings) {
                  for (const sheetList of Object.values(location.equipmentDrawings)) {
                    if (Array.isArray(sheetList)) {
                      const matchSheet = sheetList.find(s => s.internalPage === point.internalPage);
                      if (matchSheet && matchSheet.label) {
                        pointLabel = matchSheet.label;
                        pointType = matchSheet.type;
                        break;
                      }
                    }
                  }
                }

                const key = point.drawingPdfUrl || (point.internalPage ? `sheet-${point.internalPage}` : `${point.cabinet}-${point.drawingPage}`);
                if (!drawingsSet.has(key)) {
                  drawingsSet.set(key, {
                    cabinet: point.cabinet,
                    page: point.drawingPage,
                    internalPage: point.internalPage,
                    drawingPdfUrl: point.drawingPdfUrl,
                    label: pointLabel,
                    type: pointType
                  });
                }
              }
            }
          });
        });

        if (points.length > 0 || drawingsSet.size > 0) {
          const isAux = (n) => /_(?:Speed|Ols|Cls|LossSpeed|Offset[A-Za-z]+|Belt[A-Za-z]+|Alignment)\b/i.test(n || '');
          const primaryPoint = points.find(p => p.cabinet === cabinet && !isAux(p.equipmentName)) ||
                               points.find(p => p.cabinet === cabinet) ||
                               points.find(p => !isAux(p.equipmentName)) ||
                               points[0] || {
            equipmentCode: stripSubdeviceSuffix(equipmentCode) || equipmentCode,
            equipmentName: drawingsSet.size > 0 ? (Array.from(drawingsSet.values())[0].label || 'Electrical Schematic') : 'Machine Circuit',
            cabinet: cabinet
          };
          const mainCode = primaryPoint.equipmentCode || stripSubdeviceSuffix(equipmentCode) || equipmentCode || "";
          const mainName = primaryPoint.equipmentName || (mainCode ? "Machine Circuit" : "General Signals");

          setEquipment({
            code: mainCode,
            name: mainName,
            displayTitle: mainCode || mainName || equipmentCode,
            location: location.name,
            locationId: location.id,
            points: points
          });

          // Set drawings list sorted by sheet internal page number
          const list = Array.from(drawingsSet.values()).sort((a, b) => {
            const numA = parseInt(a.internalPage, 10);
            const numB = parseInt(b.internalPage, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return Number(a.page) - Number(b.page);
          });
          setAllDrawings(list);
          if (list.length > 0) {
            let defaultDrawing = list[0];
            const pointWithDrawing = points.find(p => p.drawingPdfUrl && list.some(d => d.internalPage === p.internalPage || d.drawingPdfUrl === p.drawingPdfUrl));
            if (pointWithDrawing) {
              const matchedDwg = list.find(d => d.internalPage === pointWithDrawing.internalPage || d.drawingPdfUrl === pointWithDrawing.drawingPdfUrl);
              if (matchedDwg) defaultDrawing = matchedDwg;
            }
            setCurrentDrawing(defaultDrawing);
          }
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Failed to load details:", err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [locationId, cabinet, equipmentCode]);

  // Compute filtered IO points dynamically during render
  let filteredIO = [];
  if (equipment && equipment.points) {
    let points = [...equipment.points];

    // Filter by Tab
    if (activeTab === "DI") {
      points = points.filter(p => p.type === "DI");
    } else if (activeTab === "DO") {
      points = points.filter(p => p.type === "DO");
    } else if (activeTab === "Analog") {
      points = points.filter(p => p.type === "AI" || p.type === "AO");
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const normalizedQueryCode = normalizeCode(searchQuery, locationId);
      const normalizedQueryAddress = normalizeAddress(searchQuery);
      
      points = points.filter(p => 
        p.normalizedAddress.includes(normalizedQueryAddress) ||
        p.normalizedCode.includes(normalizedQueryCode) ||
        (p.signalName && p.signalName.toLowerCase().includes(q))
      );
    }

    filteredIO = points.sort((a, b) => compareAddresses(a.address, b.address));
  }

  // Zoom/Pan Handler functions
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.1 : -0.1;
    setScale(prev => Math.min(Math.max(prev + zoomFactor, 0.5), 4));
  };

  // Mouse Drag Events for Pan
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUpOrLeave = () => setIsDragging(false);

  // Touch Events for Mobile Pinch & Pan
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDist(dist);
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDist;
      setScale(prev => Math.min(Math.max(prev * factor, 0.5), 4));
      setTouchStartDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredIO.length === 0) return;

    const dataToExport = filteredIO.map(item => ({
      "Address": item.address,
      "Type": item.type,
      "Signal Name": item.signalName || "—",
      "Cabinet": item.cabinet,
      "Drawing Sheet": item.internalPage ? `Sheet ${item.internalPage}` : "No Drawing"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "I_O List");
    const safeTitle = (equipment?.code || equipment?.name || equipmentCode || "IO_List").replace(/[^a-zA-Z0-9_\-]/g, '_');
    XLSX.writeFile(workbook, `${safeTitle}_IO_List.xlsx`);
  };

  if (isLoading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
        <p>Loading machine dashboard...</p>
      </div>
    );
  }

  if (notFound || !equipment) {
    return (
      <div style={styles.loadingScreen}>
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>🔍</div>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-main)", marginBottom: "8px" }}>
          Equipment or Circuit Not Found
        </h2>
        <p style={{ color: "var(--text-muted)", maxWidth: "420px", textAlign: "center", marginBottom: "20px", fontSize: "14px", lineHeight: "1.5" }}>
          Could not find any I/O signals matching &ldquo;{equipmentCode}&rdquo; in this section.
        </p>
        <Link
          href="/"
          style={{
            background: "var(--primary)",
            color: "#ffffff",
            padding: "10px 24px",
            borderRadius: "var(--radius-md)",
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "14px",
            boxShadow: "0 2px 8px rgba(204,17,17,0.25)",
          }}
        >
          ← Back to Search
        </Link>
      </div>
    );
  }

  const uniqueCabinets = Array.from(new Set(equipment.points.map(p => p.cabinet)));

  return (
    <div style={styles.wrapper}>
      {/* Top Header / Breadcrumb Bar */}
      <header style={styles.navbar} className="navbar-responsive no-print">
        <div style={styles.navLeft}>
          <Link href="/" style={styles.backBtn}>
            ← Search
          </Link>
          <div style={styles.breadcrumb} className="breadcrumb-desktop">
            <span>🏭 {equipment.location}</span>
            <span style={styles.divider}>/</span>
            <span>🗄️ {uniqueCabinets.join(", ") || cabinet}</span>
            <span style={styles.divider}>/</span>
            <span style={styles.activeBreadcrumb}>
              {equipment.code || equipment.name}
            </span>
          </div>
        </div>
        <div style={styles.navRight}>
          <button style={styles.exportBtn} className="export-btn-responsive" onClick={handleExportExcel}>
            📥 Export Excel
          </button>
          <button style={styles.printBtn} className="print-btn-responsive" onClick={() => window.print()}>
            🖨️ Print list
          </button>
        </div>
      </header>

      {/* Mobile view switcher tabs */}
      <div className="mobile-toggle no-print">
        <button
          className={mobileView === "table" ? "active" : ""}
          onClick={() => setMobileView("table")}
        >
          📊 Table View ({filteredIO.length})
        </button>
        <button
          className={mobileView === "drawing" ? "active" : ""}
          onClick={() => setMobileView("drawing")}
        >
          🖼️ Drawing View
        </button>
      </div>

      {/* Main Split Screen Area */}
      <div style={styles.mainLayout} className="main-layout-responsive">
        
        {/* Left Side: I/O List & Table */}
        <section style={styles.leftPanel} className={mobileView === "table" ? "panel-left-responsive" : "panel-left-hidden"}>
          <div style={styles.machineCard}>
            <span style={styles.machineBadge}>
              {equipment.code ? "MACHINE" : "CIRCUIT / SIGNALS"}
            </span>
            <h2 style={styles.machineTitle}>
              {equipment.code || equipment.name}
            </h2>
            {equipment.code && equipment.name ? (
              <p style={styles.machineDesc}>{equipment.name}</p>
            ) : (
              <p style={styles.machineDesc}>
                {equipment.points.length} Connected I/O Point{equipment.points.length > 1 ? "s" : ""}
              </p>
            )}

            {/* Quick-Access Electrical Schematic Sheet Pills */}
            {allDrawings.length > 0 && (
              <div style={styles.schematicBar} className="no-print">
                <div style={styles.schematicBarLabel}>
                  <span>⚡ Electrical Schematic Sheets ({allDrawings.length}):</span>
                </div>
                <div style={styles.schematicPills}>
                  {allDrawings.map((draw) => {
                    const isSelected = currentDrawing && (
                      (currentDrawing.internalPage && currentDrawing.internalPage === draw.internalPage) ||
                      (currentDrawing.cabinet === draw.cabinet && String(currentDrawing.page) === String(draw.page))
                    );
                    return (
                      <button
                        key={`${draw.cabinet}-${draw.internalPage || draw.page}`}
                        style={{
                          ...styles.schematicPill,
                          ...(isSelected ? styles.schematicPillActive : {})
                        }}
                        onClick={() => {
                          setCurrentDrawing(draw);
                          setMobileView("drawing");
                        }}
                        title={`View Sheet ${draw.internalPage} (${draw.label || 'Schematic'})`}
                      >
                        <span style={styles.pillIcon}>
                          {draw.type === 'power' || draw.type === 'starter' ? '⚡' : 
                           draw.type === 'vfd' ? '🔌' : 
                           draw.type === 'speed' || draw.type === 'level' ? '📡' : 
                           draw.type === 'safety' ? '🛡️' : 
                           draw.type === 'monitoring' ? '🌡️' : 
                           draw.type === 'meter' ? '📊' : 
                           draw.type === 'auxiliary' ? '⚙️' : 
                           draw.type === 'valve' ? '🔧' : '🎛️'}
                        </span>
                        <span>Sheet {draw.internalPage}</span>
                        {draw.label && (
                          <span style={{
                            ...styles.pillSubLabel,
                            ...(isSelected ? styles.pillSubLabelActive : {})
                          }}>
                            • {draw.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Search inside table */}
          <div style={styles.tableControls} className="no-print">
            <input
              type="text"
              style={styles.tableSearchInput}
              placeholder="Search I/O address or signal name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Tabs */}
          <div style={styles.tabs} className="no-print">
            <button
              style={{ ...styles.tab, ...(activeTab === "all" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("all")}
            >
              All Signals ({equipment.points.length})
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === "DI" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("DI")}
            >
              DI ({equipment.points.filter(p => p.type === "DI").length})
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === "DO" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("DO")}
            >
              DO ({equipment.points.filter(p => p.type === "DO").length})
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === "Analog" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("Analog")}
            >
              Analog ({equipment.points.filter(p => p.type === "AI" || p.type === "AO").length})
            </button>
          </div>

          {/* Table Container */}
          <div style={styles.tableContainer} className="table-container-responsive">
            <table style={styles.table} className="table-responsive">
              <thead>
                <tr>
                  <th style={styles.th}>Address</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Signal Name</th>
                  <th style={styles.th}>Cabinet</th>
                  <th style={styles.th} className="no-print">Drawing Sheet</th>
                </tr>
              </thead>
              <tbody>
                {filteredIO.map((row, index) => {
                  const isHighlighted = row.signalName && (
                    row.signalName.toLowerCase().includes("emergency") ||
                    row.signalName.toLowerCase().includes("fault") ||
                    row.signalName.toLowerCase().includes("trip")
                  );
                  
                  return (
                    <tr
                      key={`${row.address || ""}-${row.signalName || ""}-${index}`}
                      style={{
                        ...styles.tr,
                        ...(isHighlighted ? styles.trHighlighted : {})
                      }}
                    >
                      <td style={{ ...styles.td, fontWeight: "700" }}>{row.address}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.typeBadge,
                          ...(row.type === "DI" ? styles.badgeDI :
                              row.type === "DO" ? styles.badgeDO : styles.badgeAnalog)
                        }}>
                          {row.type}
                        </span>
                      </td>
                      <td style={styles.td}>{row.signalName || "—"}</td>
                      <td style={styles.td}>
                        <span style={styles.badgeCabinet}>{row.cabinet || "—"}</span>
                      </td>
                      <td style={styles.td} className="no-print">
                        {row.drawingPage && row.drawingPdfUrl ? (
                          <button
                            style={styles.sheetLinkBtn}
                            onClick={() => {
                              const drawing = allDrawings.find(d => String(d.internalPage) === String(row.internalPage)) ||
                                              allDrawings.find(d => d.cabinet === row.cabinet && d.page === row.drawingPage) ||
                                              {
                                                cabinet: row.cabinet,
                                                page: row.drawingPage,
                                                internalPage: row.internalPage,
                                                drawingPdfUrl: row.drawingPdfUrl,
                                                label: 'PLC Rack Wiring',
                                                type: 'control'
                                              };
                              setCurrentDrawing(drawing);
                              setMobileView("drawing");
                            }}
                          >
                            🖼️ Sheet {row.internalPage}
                          </button>
                        ) : (
                          <span style={styles.noDrawingBadge}>No Drawing</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredIO.length === 0 && (
                  <tr>
                    <td colSpan="5" style={styles.noDataCell}>No I/O records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Side: Zoom/Pan Drawing Sheets */}
        <section style={styles.rightPanel} className={mobileView === "drawing" ? "panel-right-responsive no-print" : "panel-right-hidden no-print"}>
          {currentDrawing ? (
            <div style={styles.viewerContainer}>
              {/* Toolbar */}
              <div style={styles.viewerToolbar} className="viewer-toolbar-responsive">
                <div style={styles.sheetSelectorWrapper}>
                  <span style={styles.selectorLabel} className="label-desktop">Select Sheet:</span>
                  <select
                    style={styles.sheetSelect}
                    className="sheet-select-responsive"
                    value={`${currentDrawing.cabinet}|${currentDrawing.internalPage || currentDrawing.page}`}
                    onChange={(e) => {
                      const [cab, pageId] = e.target.value.split("|");
                      const drawing = allDrawings.find(d => d.cabinet === cab && (d.internalPage === pageId || String(d.page) === pageId));
                      if (drawing) setCurrentDrawing(drawing);
                    }}
                  >
                    {allDrawings.map((draw, idx) => (
                      <option key={`${draw.cabinet}|${draw.internalPage || draw.page}`} value={`${draw.cabinet}|${draw.internalPage || draw.page}`}>
                        Sheet {draw.internalPage} {draw.label ? `— ${draw.label}` : ''} ({draw.cabinet})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Scale controls */}
                <div style={styles.scaleControls}>
                  <button style={styles.controlBtn} className="control-btn-responsive" onClick={handleZoomOut}>-</button>
                  <span style={styles.scalePercent} className="scale-percent-responsive">{Math.round(scale * 100)}%</span>
                  <button style={styles.controlBtn} className="control-btn-responsive" onClick={handleZoomIn}>+</button>
                  <button style={styles.controlBtn} className="control-btn-responsive reset-btn-responsive" onClick={handleResetZoom}>Reset</button>
                </div>
              </div>

              {/* Drawing Area (Pannable / Zoomable) */}
              <div
                ref={containerRef}
                style={styles.canvasContainer}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
              >
                <div
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: "center center",
                    transition: isDragging ? "none" : "transform 0.1s ease-out",
                    cursor: isDragging ? "grabbing" : "grab",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imageRef}
                    src={currentDrawing.drawingPdfUrl}
                    alt={`Drawing Sheet ${currentDrawing.internalPage}`}
                    style={styles.drawingImage}
                    draggable="false"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.parentElement) {
                        const msg = document.createElement('div');
                        msg.style.cssText = 'color:#94a3b8;text-align:center;padding:40px;font-size:14px;';
                        msg.innerHTML = '<div style="font-size:48px;margin-bottom:12px">🖼️</div><h3>Drawing Not Available</h3><p style="margin-top:8px;opacity:0.7">Image file not found for this sheet.</p>';
                        e.target.parentElement.appendChild(msg);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.noDrawingBlock}>
              <div style={styles.noDrawingIcon}>🖼️</div>
              <h3>No Schematic Available</h3>
              <p>No circuit drawings are mapped to this machine.</p>
            </div>
          )}
        </section>
      </div>

      {/* Print Page Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    width: "100vw",
    background: "var(--bg-main)",
  },
  loadingScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100dvh",
    gap: "16px",
    background: "var(--bg-main)",
    color: "var(--text-muted)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid var(--border-color)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  navbar: {
    height: "64px",
    background: "#ffffff",
    borderBottom: "1px solid var(--border-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    flexShrink: 0,
    zIndex: 10,
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  },
  navLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    color: "var(--text-muted)",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "14px",
    background: "var(--bg-main)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "6px 12px",
    transition: "all var(--transition-fast)",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "var(--text-muted)",
    fontWeight: "500",
  },
  divider: {
    color: "var(--text-light)",
  },
  activeBreadcrumb: {
    fontWeight: "700",
    color: "var(--text-main)",
  },
  navRight: {
    display: "flex",
    gap: "8px",
  },
  exportBtn: {
    background: "var(--primary)",
    color: "#ffffff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  printBtn: {
    background: "#ffffff",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-main)",
    cursor: "pointer",
  },
  mainLayout: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
    width: "100%",
  },
  leftPanel: {
    flex: "1",
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    borderRight: "1px solid var(--border-color)",
    overflow: "hidden",
    padding: "20px",
  },
  machineCard: {
    background: "var(--bg-main)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "16px",
    marginBottom: "16px",
  },
  machineBadge: {
    fontSize: "10px",
    fontWeight: "800",
    color: "var(--primary)",
    background: "var(--primary-light)",
    padding: "2px 6px",
    borderRadius: "4px",
    letterSpacing: "0.5px",
  },
  machineTitle: {
    fontSize: "24px",
    fontWeight: "800",
    color: "var(--text-main)",
    marginTop: "8px",
  },
  machineDesc: {
    fontSize: "14px",
    color: "var(--text-muted)",
    marginTop: "2px",
  },
  schematicBar: {
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: "1px dashed var(--border-color)",
  },
  schematicBarLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "var(--text-muted)",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  schematicPills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  schematicPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#ffffff",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-color)",
    borderRadius: "20px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-main)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  },
  schematicPillActive: {
    background: "var(--primary)",
    borderColor: "var(--primary)",
    color: "#ffffff",
    boxShadow: "0 2px 6px rgba(204,17,17,0.3)",
  },
  pillIcon: {
    fontSize: "13px",
  },
  pillSubLabel: {
    fontSize: "11px",
    fontWeight: "500",
    color: "var(--text-muted)",
  },
  pillSubLabelActive: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  tableControls: {
    marginBottom: "12px",
  },
  tableSearchInput: {
    width: "100%",
    height: "40px",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "0 12px",
    fontSize: "14px",
    background: "var(--bg-main)",
  },
  tabs: {
    display: "flex",
    gap: "4px",
    borderBottom: "1px solid var(--border-color)",
    marginBottom: "16px",
  },
  tab: {
    padding: "10px 16px",
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-muted)",
    background: "transparent",
    border: "none",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    cursor: "pointer",
  },
  tabActive: {
    color: "var(--primary)",
    borderBottomColor: "var(--primary)",
  },
  tableContainer: {
    flex: 1,
    overflowY: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    background: "var(--bg-main)",
    padding: "12px 16px",
    fontWeight: "600",
    color: "var(--text-muted)",
    borderBottom: "1px solid var(--border-color)",
  },
  tr: {
    borderBottom: "1px solid var(--border-color)",
    transition: "background var(--transition-fast)",
  },
  trHighlighted: {
    background: "rgba(245, 158, 11, 0.08)",
  },
  td: {
    padding: "12px 16px",
    color: "var(--text-main)",
    verticalAlign: "middle",
  },
  typeBadge: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  badgeDI: {
    color: "var(--accent-green)",
    background: "rgba(16, 185, 129, 0.1)",
  },
  badgeDO: {
    color: "var(--primary)",
    background: "var(--primary-light)",
  },
  badgeAnalog: {
    color: "var(--accent-blue)",
    background: "rgba(2, 132, 199, 0.1)",
  },
  badgeCabinet: {
    display: "inline-block",
    fontSize: "10px",
    fontWeight: "600",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "var(--text-secondary)",
    background: "rgba(148, 163, 184, 0.15)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    whiteSpace: "nowrap",
  },
  sheetLinkBtn: {
    background: "var(--primary-light)",
    color: "var(--primary)",
    border: "1px solid rgba(204, 17, 17, 0.2)",
    borderRadius: "var(--radius-sm)",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  noDrawingBadge: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
    fontSize: "11px",
    fontWeight: "500",
    color: "var(--text-light)",
    background: "#f1f5f9",
    border: "1px solid var(--border-color)",
  },
  noDataCell: {
    textAlign: "center",
    padding: "40px",
    color: "var(--text-muted)",
  },
  rightPanel: {
    flex: "1.2",
    display: "flex",
    flexDirection: "column",
    background: "#0f172a",
    overflow: "hidden",
  },
  viewerContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
  },
  viewerToolbar: {
    height: "48px",
    background: "#1e293b",
    borderBottom: "1px solid #334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    flexShrink: 0,
    zIndex: 5,
  },
  sheetSelectorWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  selectorLabel: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "600",
  },
  sheetSelect: {
    background: "#0f172a",
    color: "#f8fafc",
    border: "1px solid #475569",
    borderRadius: "var(--radius-sm)",
    padding: "4px 8px",
    fontSize: "12px",
    fontWeight: "600",
  },
  scaleControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  controlBtn: {
    background: "#334155",
    color: "#f8fafc",
    border: "none",
    borderRadius: "4px",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    cursor: "pointer",
  },
  scalePercent: {
    fontSize: "12px",
    color: "#f8fafc",
    fontWeight: "600",
    width: "48px",
    textAlign: "center",
  },
  canvasContainer: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  drawingImage: {
    maxWidth: "96%",
    maxHeight: "96%",
    objectFit: "contain",
    userSelect: "none",
    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
  },
  noDrawingBlock: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    gap: "12px",
  },
  noDrawingIcon: {
    fontSize: "48px",
  },
};
