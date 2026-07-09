import { useEffect, useRef } from 'react';

export default function SearchSuggestions({
  suggestions,
  activeIndex,
  onSelect,
  visible,
}) {
  const listRef = useRef(null);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <div style={styles.container} ref={listRef}>
      {suggestions.map((item, index) => (
        <button
          key={`${item.code}-${item.location}-${index}`}
          style={{
            ...styles.item,
            ...(index === activeIndex ? styles.itemActive : {}),
          }}
          onClick={() => onSelect(item)}
          onMouseDown={(e) => e.preventDefault()} // Prevent input blur
        >
          <span style={styles.code}>{item.code}</span>
          <span style={styles.name}>{item.name}</span>
          <span style={styles.location}>
            📍 {item.location}
          </span>
        </button>
      ))}
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    background: '#ffffff',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08), 0 0 20px rgba(204, 17, 17, 0.06)',
    zIndex: 1000,
    maxHeight: 360,
    overflowY: 'auto',
    animation: 'fadeIn 0.15s ease',
    zIndex: 100,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  itemActive: {
    background: 'rgba(204, 17, 17, 0.08)',
  },
  code: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(204, 17, 17, 0.08)',
    color: 'var(--accent-blue)',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'Inter', monospace",
    minWidth: 44,
    flexShrink: 0,
  },
  name: {
    flex: 1,
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  location: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
};
