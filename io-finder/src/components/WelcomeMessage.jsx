import { useState } from 'react';

const quickSearches = [
  'Fan',
  'Elevator',
  '1005',
  'Screw Feeder',
  'Pneumatic Gate',
  'Conveyor',
  'Mixer',
  'Pump',
];

export default function WelcomeMessage({ onQuickSearch }) {
  const [hoveredChip, setHoveredChip] = useState(null);

  return (
    <div style={styles.container}>
      {/* Glowing Logo */}
      <div style={styles.logoWrapper}>
        <span style={styles.logo}>⚡</span>
      </div>

      {/* Title */}
      <h1 style={styles.title}>Welcome to I/O Finder</h1>

      {/* Description */}
      <p style={styles.description}>
        Search for equipment I/O data across all control cabinets.
        <br />
        Type a machine name, code, or I/O address to get started.
      </p>

      {/* Quick Search Chips */}
      <div style={styles.chipsContainer}>
        <p style={styles.chipsLabel}>Try searching for:</p>
        <div style={styles.chipsGrid}>
          {quickSearches.map((query) => (
            <button
              key={query}
              style={{
                ...styles.chip,
                ...(hoveredChip === query ? styles.chipHover : {}),
              }}
              onMouseEnter={() => setHoveredChip(query)}
              onMouseLeave={() => setHoveredChip(null)}
              onClick={() => onQuickSearch(query)}
            >
              <span style={styles.chipIcon}>🔍</span>
              {query}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    animation: 'fadeIn 0.6s ease, slideUp 0.6s ease',
    maxWidth: 600,
    margin: '0 auto',
    textAlign: 'center',
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(204, 17, 17, 0.15) 0%, transparent 70%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    animation: 'glowPulse 3s ease-in-out infinite',
  },
  logo: {
    fontSize: 48,
    filter: 'drop-shadow(0 0 12px rgba(204, 17, 17, 0.4))',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 12,
    letterSpacing: '-0.02em',
  },
  description: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
    marginBottom: 32,
    maxWidth: 460,
  },
  chipsContainer: {
    width: '100%',
  },
  chipsLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 12,
  },
  chipsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  chipHover: {
    borderColor: 'var(--accent-blue)',
    color: 'var(--accent-blue)',
    background: 'rgba(204, 17, 17, 0.08)',
    boxShadow: '0 0 16px rgba(204, 17, 17, 0.15)',
    transform: 'translateY(-1px)',
  },
  chipIcon: {
    fontSize: 12,
  },
};
