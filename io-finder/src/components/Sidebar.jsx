import { useMemo } from 'react';

const FUTURE_LOCATIONS = [
  { id: 'tower1', name: 'Tower 1' },
  { id: 'tower2', name: 'Tower 2' },
  { id: 'tower4', name: 'Tower 4' },
  { id: 'silo', name: 'SILO' },
  { id: 'intake2', name: 'INTAKE 2' },
];

export default function Sidebar({
  locations,
  selectedLocation,
  onSelectLocation,
  ioData,
  sidebarOpen,
  onToggleSidebar,
}) {
  // Calculate total I/O points
  const totalIO = useMemo(() => {
    if (!ioData?.locations) return 0;
    let count = 0;
    for (const loc of ioData.locations) {
      for (const cab of loc.cabinets) {
        count += cab.io.length;
      }
    }
    return count;
  }, [ioData]);

  // Get cabinet count for a location
  const getCabinetCount = (locationId) => {
    const loc = ioData?.locations?.find((l) => l.id === locationId);
    return loc ? loc.cabinets.length : 0;
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={styles.overlay} onClick={onToggleSidebar} />
      )}

      <aside
        style={{
          ...styles.sidebar,
          ...(sidebarOpen ? styles.sidebarOpen : {}),
        }}
      >
        {/* Branding */}
        <div style={styles.brand}>
          <span style={styles.brandIcon}>⚡</span>
          <span style={styles.brandText}>I/O Finder</span>
        </div>

        <div style={styles.separator} />

        {/* Navigation */}
        <nav style={styles.nav}>
          {/* All Locations */}
          <button
            style={{
              ...styles.navItem,
              ...(selectedLocation === null ? styles.navItemActive : {}),
            }}
            onClick={() => {
              onSelectLocation(null);
              if (sidebarOpen) onToggleSidebar();
            }}
          >
            <span style={styles.navIcon}>🌐</span>
            <span style={styles.navLabel}>All Locations</span>
          </button>

          {/* Available Locations */}
          {locations.map((loc) => (
            <button
              key={loc.id}
              style={{
                ...styles.navItem,
                ...(selectedLocation === loc.id ? styles.navItemActive : {}),
              }}
              onClick={() => {
                onSelectLocation(loc.id);
                if (sidebarOpen) onToggleSidebar();
              }}
            >
              <span style={styles.navIcon}>🏭</span>
              <span style={styles.navLabel}>{loc.name}</span>
              <span style={styles.badge}>{getCabinetCount(loc.id)}</span>
            </button>
          ))}

          {/* Separator */}
          {locations.length > 0 && <div style={styles.sectionSeparator} />}

          {/* Future Locations */}
          {FUTURE_LOCATIONS.map((loc) => (
            <div key={loc.id} style={styles.navItemDisabled}>
              <span style={styles.navIcon}>🏭</span>
              <span style={styles.navLabelDisabled}>{loc.name}</span>
              <span style={styles.comingSoon}>Coming Soon</span>
            </div>
          ))}
        </nav>

        {/* Stats Footer */}
        <div style={styles.footer}>
          <div style={styles.separator} />
          <div style={styles.stats}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{totalIO.toLocaleString()}</span>
              <span style={styles.statLabel}>Total I/O Points</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{locations.length}</span>
              <span style={styles.statLabel}>Locations</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 90,
    animation: 'fadeIn 0.2s ease',
  },
  sidebar: {
    width: 280,
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #0f1629 0%, #0a0e17 100%)',
    borderRight: '1px solid var(--border-color)',
    zIndex: 100,
    transition: 'transform 0.3s ease',
    overflowY: 'auto',
  },
  sidebarOpen: {},
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 20px 16px',
  },
  brandIcon: {
    fontSize: 26,
    filter: 'drop-shadow(0 0 8px rgba(14, 165, 233, 0.5))',
    animation: 'glowPulse 3s ease-in-out infinite',
  },
  brandText: {
    fontSize: 20,
    fontWeight: 700,
    background: 'linear-gradient(135deg, var(--accent-blue), #38bdf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.02em',
  },
  separator: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)',
    margin: '0 16px',
  },
  nav: {
    flex: 1,
    padding: '12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    borderLeft: '3px solid transparent',
  },
  navItemActive: {
    background: 'rgba(14, 165, 233, 0.1)',
    color: 'var(--text-primary)',
    borderLeft: '3px solid var(--accent-blue)',
    boxShadow: 'inset 0 0 20px rgba(14, 165, 233, 0.05)',
  },
  navItemDisabled: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    borderLeft: '3px solid transparent',
    opacity: 0.35,
    cursor: 'default',
  },
  navIcon: {
    fontSize: 15,
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  navLabelDisabled: {
    flex: 1,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
    height: 20,
    padding: '0 6px',
    borderRadius: 10,
    background: 'rgba(14, 165, 233, 0.12)',
    color: 'var(--accent-blue)',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  comingSoon: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(148, 163, 184, 0.1)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    flexShrink: 0,
  },
  sectionSeparator: {
    height: 1,
    background: 'rgba(148, 163, 184, 0.08)',
    margin: '8px 8px',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 16,
  },
  stats: {
    display: 'flex',
    gap: 16,
    padding: '14px 20px 0',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--accent-blue)',
  },
  statLabel: {
    fontSize: 10,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 500,
  },
};
