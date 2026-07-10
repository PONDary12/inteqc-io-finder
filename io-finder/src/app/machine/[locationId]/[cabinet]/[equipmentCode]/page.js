"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";

export default function MachineDetail({ params }) {
  const router = useRouter();
  
  // Resolve params using React 19 use()
  const resolvedParams = use(params);
  const { locationId, cabinet, equipmentCode } = resolvedParams;

  const [ioData, setIoData] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [allLocationEquipments, setAllLocationEquipments] = useState([]);
  const [filteredIO, setFilteredIO] = useState([]);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, DI, DO, Analog
  
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
    async function loadData() {
      try {
        const res = await fetch("/data/io-data.json");
        const data = await res.json();
        setIoData(data);

        // Find location
        const location = data.locations.find(l => l.id === locationId);
        if (!location) return;

        // Collect all unique equipments in this location for sidebar navigation
        const equipMap = new Map();
        location.cabinets.forEach(cab => {
          cab.io.forEach(point => {
            if (point.equipmentCode && !equipMap.has(point.equipmentCode)) {
              equipMap.set(point.equipmentCode, {
                code: point.equipmentCode,
                name: point.equipmentName,
                cabinet: point.cabinet
              });
            }
          });
        });
        setAllLocationEquipments(Array.from(equipMap.values()));

        // Find the selected equipment points in the location
        const points = [];
        const drawingsSet = new Map();

        location.cabinets.forEach(cab => {
          cab.io.forEach(point => {
            if (point.equipmentCode === equipmentCode) {
              points.push(point);
              
              // Map drawings
              if (point.drawingPdfUrl && point.drawingPage) {
                const key = `${point.cabinet}-${point.drawingPage}`;
                if (!drawingsSet.has(key)) {
                  drawingsSet.set(key, {
                    cabinet: point.cabinet,
                    page: point.drawingPage,
                    internalPage: point.internalPage,
                    drawingPdfUrl: point.drawingPdfUrl
                  });
                }
              }
            }
          });
        });

        if (points.length > 0) {
          const equipName = points[0].equipmentName || "Unknown Machine";
          setEquipment({
            code: equipmentCode,
            name: equipName,
            location: location.name,
            locationId: location.id,
            points: points
          });

          // Set drawings list sorted by sheet page number
          const list = Array.from(drawingsSet.values()).sort((a, b) => Number(a.page) - Number(b.page));
          setAllDrawings(list);
          if (list.length > 0) {
            setCurrentDrawing(list[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load details:", err);
      }
    }
    loadData();
  }, [locationId, cabinet, equipmentCode]);

  // Filter I/O points based on activeTab and searchQuery
  useEffect(() => {
    if (!equipment || !equipment.points) return;

    let points = equipment.points;

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
      points = points.filter(p => 
        p.address.toLowerCase().includes(q) ||
        (p.signalName && p.signalName.toLowerCase().includes(q))
      );
    }

    setFilteredIO(points.sort((a, b) => a.seq - b.seq));
  }, [equipment, activeTab, searchQuery]);

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
      "Sequence": item.seq,
      "Address": item.address,
      "Signal Name": item.signalName || "N/A",
      "Type": item.type,
      "Cabinet": item.cabinet,
      "Drawing Sheet": item.internalPage || "N/A"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "I_O List");
    XLSX.writeFile(workbook, `${equipmentCode}_IO_List.xlsx`);
  };

  if (!equipment) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
        <p>Loading machine dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* Top Header / Breadcrumb Bar */}
      <header style={styles.navbar} className="no-print">
        <div style={styles.navLeft}>
          <Link href="/" style={styles.backBtn}>
            🡸 Search
          </Link>
          <div style={styles.breadcrumb}>
            <span>🏭 {equipment.location}</span>
            <span style={styles.divider}>/</span>
            <span>🗄️ {cabinet}</span>
            <span style={styles.divider}>/</span>
            <span style={styles.activeBreadcrumb}>{equipment.code}</span>
          </div>
        </div>
        <div style={styles.navRight}>
          <button style={styles.exportBtn} onClick={handleExportExcel}>
            📥 Export Excel
          </button>
          <button style={styles.printBtn} onClick={() => window.print()}>
            🖨️ Print list
          </button>
        </div>
      </header>

      {/* Main Split Screen Area */}
      <div style={styles.mainLayout}>
        
        {/* Left Side: I/O List & Table */}
        <section style={styles.leftPanel}>
          <div style={styles.machineCard}>
            <span style={styles.machineBadge}>MACHINE</span>
            <h2 style={styles.machineTitle}>{equipment.code}</h2>
            <p style={styles.machineDesc}>{equipment.name}</p>
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
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Seq</th>
                  <th style={styles.th}>Address</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Signal Name</th>
                  <th style={styles.th} className="no-print">Drawing Sheet</th>
                </tr>
              </thead>
              <tbody>
                {filteredIO.map((row) => {
                  const isHighlighted = row.signalName && (
                    row.signalName.toLowerCase().includes("emergency") ||
                    row.signalName.toLowerCase().includes("fault") ||
                    row.signalName.toLowerCase().includes("trip")
                  );
                  
                  return (
                    <tr
                      key={row.seq}
                      style={{
                        ...styles.tr,
                        ...(isHighlighted ? styles.trHighlighted : {})
                      }}
                    >
                      <td style={styles.td}>{row.seq}</td>
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
                      <td style={styles.td} className="no-print">
                        {row.drawingPage && row.drawingPdfUrl ? (
                          <button
                            style={styles.sheetLinkBtn}
                            onClick={() => {
                              const drawing = allDrawings.find(d => d.page === row.drawingPage);
                              if (drawing) setCurrentDrawing(drawing);
                            }}
                          >
                            🖼️ Sheet {row.internalPage}
                          </button>
                        ) : "—"}
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
        <section style={styles.rightPanel} className="no-print">
          {currentDrawing ? (
            <div style={styles.viewerContainer}>
              {/* Toolbar */}
              <div style={styles.viewerToolbar}>
                <div style={styles.sheetSelectorWrapper}>
                  <span style={styles.selectorLabel}>📄 Select Sheet:</span>
                  <select
                    style={styles.sheetSelect}
                    value={`${currentDrawing.cabinet}-${currentDrawing.page}`}
                    onChange={(e) => {
                      const [cab, pg] = e.target.value.split("-");
                      const drawing = allDrawings.find(d => d.cabinet === cab && String(d.page) === pg);
                      if (drawing) setCurrentDrawing(drawing);
                    }}
                  >
                    {allDrawings.map((draw, idx) => (
                      <option key={`${draw.cabinet}-${draw.page}`} value={`${draw.cabinet}-${draw.page}`}>
                        Sheet {draw.internalPage} ({draw.cabinet})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Scale controls */}
                <div style={styles.scaleControls}>
                  <button style={styles.controlBtn} onClick={handleZoomOut}>➖</button>
                  <span style={styles.scalePercent}>{Math.round(scale * 100)}%</span>
                  <button style={styles.controlBtn} onClick={handleZoomIn}>➕</button>
                  <button style={styles.controlBtn} onClick={handleResetZoom}>↺ Reset</button>
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
    borderBottom: "2px solid transparent",
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
