import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';

export default function App() {
  const [ioData, setIoData] = useState(null);
  const [searchIndex, setSearchIndex] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch data on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [ioRes, indexRes] = await Promise.allSettled([
          fetch('/data/io-data.json'),
          fetch('/data/search-index.json'),
        ]);

        if (ioRes.status === 'fulfilled' && ioRes.value.ok) {
          const data = await ioRes.value.json();
          setIoData(data);
        } else {
          console.warn('Could not load io-data.json — data files may not exist yet.');
        }

        if (indexRes.status === 'fulfilled' && indexRes.value.ok) {
          const data = await indexRes.value.json();
          setSearchIndex(data);
        } else {
          console.warn('Could not load search-index.json — data files may not exist yet.');
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Extract locations list from ioData
  const locations = useMemo(() => {
    if (!ioData?.locations) return [];
    return ioData.locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
    }));
  }, [ioData]);

  const showSidebar = !isMobile || sidebarOpen;

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          locations={locations}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          ioData={ioData}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Area */}
      <main
        style={{
          ...styles.main,
          marginLeft: isMobile ? 0 : 280,
        }}
      >
        {/* Mobile Header */}
        {isMobile && (
          <div style={styles.mobileHeader}>
            <button
              style={styles.menuBtn}
              onClick={() => setSidebarOpen(true)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div style={styles.mobileTitle}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <span style={styles.mobileTitleText}>I/O Finder</span>
            </div>
            {selectedLocation && (
              <span style={styles.locationTag}>
                📍 {locations.find((l) => l.id === selectedLocation)?.name || selectedLocation}
              </span>
            )}
          </div>
        )}

        {/* No data message */}
        {!isLoading && !ioData && (
          <div style={styles.noDataBanner}>
            <span style={{ fontSize: 20 }}>📂</span>
            <div>
              <p style={styles.noDataTitle}>No data loaded</p>
              <p style={styles.noDataText}>
                Place <code style={styles.code}>io-data.json</code> and{' '}
                <code style={styles.code}>search-index.json</code> in the{' '}
                <code style={styles.code}>public/data/</code> directory to get started.
              </p>
            </div>
          </div>
        )}

        {/* Chat Interface */}
        <ChatInterface
          ioData={ioData}
          searchIndex={searchIndex}
          selectedLocation={selectedLocation}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}

const styles = {
  app: {
    display: 'flex',
    height: '100vh',
    height: '100dvh',
    overflow: 'hidden',
    background: 'var(--bg-primary)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
    overflow: 'hidden',
  },
  mobileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    background: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  menuBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  mobileTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  mobileTitleText: {
    fontSize: 16,
    fontWeight: 700,
    background: 'linear-gradient(135deg, var(--accent-blue), #ef4444)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  locationTag: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    padding: '3px 8px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(204, 17, 17, 0.08)',
    border: '1px solid rgba(204, 17, 17, 0.15)',
    whiteSpace: 'nowrap',
  },
  noDataBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    margin: '16px 24px 0',
    padding: '14px 18px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    animation: 'fadeIn 0.3s ease',
  },
  noDataTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--accent-yellow)',
    marginBottom: 4,
  },
  noDataText: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  code: {
    padding: '1px 6px',
    borderRadius: 4,
    background: 'rgba(204, 17, 17, 0.08)',
    color: 'var(--accent-blue)',
    fontSize: 11,
    fontFamily: "'Inter', monospace",
    fontWeight: 500,
  },
};
