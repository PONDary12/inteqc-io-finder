import { useState } from 'react';

const IO_TYPE_CONFIG = {
  DI: {
    label: 'Digital Input',
    icon: '🟢',
    color: 'var(--accent-green)',
    bgColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  AI: {
    label: 'Analog Input',
    icon: '🟡',
    color: 'var(--accent-yellow)',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  DO: {
    label: 'Digital Output',
    icon: '🔴',
    color: 'var(--accent-red)',
    bgColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  AO: {
    label: 'Analog Output',
    icon: '🟠',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.4)',
  },
};

function IOSection({ type, entries }) {
  const [expanded, setExpanded] = useState(true);
  const config = IO_TYPE_CONFIG[type] || IO_TYPE_CONFIG.DI;

  if (!entries || entries.length === 0) return null;

  return (
    <div
      style={{
        ...sectionStyles.container,
        borderLeft: `3px solid ${config.borderColor}`,
      }}
    >
      <button
        style={sectionStyles.header}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={sectionStyles.headerLeft}>
          <span style={sectionStyles.icon}>{config.icon}</span>
          <span style={{ ...sectionStyles.label, color: config.color }}>
            {config.label} ({type})
          </span>
          <span
            style={{
              ...sectionStyles.badge,
              background: config.bgColor,
              color: config.color,
            }}
          >
            {entries.length}
          </span>
        </div>
        <span
          style={{
            ...sectionStyles.chevron,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div style={sectionStyles.tableWrapper}>
          <table style={sectionStyles.table}>
            <thead>
              <tr>
                <th style={{ ...sectionStyles.th, width: 50 }}>#</th>
                <th style={{ ...sectionStyles.th, width: 100 }}>Address</th>
                <th style={sectionStyles.th}>Signal Name</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={`${entry.address}-${idx}`} style={sectionStyles.tr}>
                  <td style={sectionStyles.td}>{entry.seq}</td>
                  <td style={{ ...sectionStyles.td, ...sectionStyles.address }}>
                    {entry.address}
                  </td>
                  <td style={sectionStyles.td}>{entry.signalName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function IOResultCard({ result, index }) {
  const totalIO =
    (result.diList?.length || 0) +
    (result.aiList?.length || 0) +
    (result.doList?.length || 0) +
    (result.aoList?.length || 0);

  return (
    <div
      style={{
        ...styles.card,
        animationDelay: `${index * 0.05}s`,
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <span style={styles.codeBadge}>{result.equipmentCode}</span>
          <h3 style={styles.equipmentName}>{result.equipmentName}</h3>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.metaItem}>
            📍 {result.location}
          </span>
          <span style={styles.metaDivider}>•</span>
          <span style={styles.metaItem}>
            🗄️ {result.cabinet}
          </span>
          <span style={styles.metaDivider}>•</span>
          <span style={styles.metaItem}>
            {totalIO} point{totalIO !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* I/O Sections */}
      <div style={styles.sections}>
        <IOSection type="DI" entries={result.diList} />
        <IOSection type="AI" entries={result.aiList} />
        <IOSection type="DO" entries={result.doList} />
        <IOSection type="AO" entries={result.aoList} />
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <button style={styles.drawingBtn} disabled title="Drawing viewer coming soon">
          📄 View Drawing
          <span style={styles.comingSoon}>Coming Soon</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    animation: 'slideUp 0.3s ease forwards',
    opacity: 0,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  header: {
    padding: '16px 18px 12px',
    borderBottom: '1px solid var(--border-color)',
    background: '#fafafa',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  codeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(204, 17, 17, 0.08)',
    color: 'var(--accent-blue)',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Inter', monospace",
    letterSpacing: '0.02em',
  },
  equipmentName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  metaDivider: {
    color: 'rgba(148, 163, 184, 0.4)',
    fontSize: 10,
  },
  sections: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  footer: {
    padding: '10px 18px 12px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'flex-end',
    background: '#fafafa',
  },
  drawingBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    background: 'rgba(148, 163, 184, 0.05)',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  comingSoon: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '1px 5px',
    borderRadius: 3,
    background: 'rgba(133, 77, 14, 0.12)',
    color: 'var(--accent-yellow)',
    fontWeight: 600,
  },
};

const sectionStyles = {
  container: {
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(241, 245, 249, 0.6)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '1px 7px',
    borderRadius: 10,
  },
  chevron: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    transition: 'transform 0.2s ease',
  },
  tableWrapper: {
    padding: '0 12px 8px',
    animation: 'fadeIn 0.2s ease',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },
  th: {
    textAlign: 'left',
    padding: '5px 8px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
  },
  tr: {
    transition: 'background 0.1s ease',
  },
  td: {
    padding: '5px 8px',
    color: 'var(--text-primary)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
    fontSize: 12,
  },
  address: {
    fontFamily: "'Inter', monospace",
    fontWeight: 600,
    color: 'var(--accent-blue)',
    fontSize: 12,
  },
};
