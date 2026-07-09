import { useState, useRef, useEffect, useCallback } from 'react';
import SearchSuggestions from './SearchSuggestions';
import IOResultCard from './IOResultCard';
import WelcomeMessage from './WelcomeMessage';
import { searchEquipment, getSuggestions } from '../utils/searchEngine';

export default function ChatInterface({
  ioData,
  searchIndex,
  selectedLocation,
  isLoading,
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update suggestions as user types — filtered by selected location
  useEffect(() => {
    if (inputValue.trim().length >= 1 && searchIndex) {
      const results = getSuggestions(inputValue, searchIndex, 8, selectedLocation);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setActiveIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, searchIndex, selectedLocation]);

  const handleSearch = useCallback(
    (query) => {
      if (!query.trim() || !ioData) return;

      const trimmedQuery = query.trim();

      // Add user message
      const userMsg = {
        id: Date.now(),
        type: 'user',
        text: trimmedQuery,
      };

      // Perform search
      const results = searchEquipment(trimmedQuery, ioData, selectedLocation);

      // Build system response
      let systemMsg;
      if (results.length > 0) {
        const totalPoints = results.reduce(
          (sum, r) =>
            sum +
            (r.diList?.length || 0) +
            (r.aiList?.length || 0) +
            (r.doList?.length || 0) +
            (r.aoList?.length || 0),
          0
        );

        const topResult = results[0];
        const cleanCode = topResult.equipmentCode.split(' ')[0];
        const normCode = cleanCode.toLowerCase().replace(/[\._\-\s]/g, '');
        const normQuery = trimmedQuery.toLowerCase().replace(/[\._\-\s]/g, '');

        let msgText = `Found **${results.length}** equipment match${results.length !== 1 ? 'es' : ''} with **${totalPoints}** I/O point${totalPoints !== 1 ? 's' : ''}${selectedLocation ? ' in selected location' : ''}:`;

        if (cleanCode.toLowerCase() !== trimmedQuery.toLowerCase() && normCode === normQuery) {
          msgText = `Did you mean **${cleanCode}**? Showing matching results for it:`;
        }

        systemMsg = {
          id: Date.now() + 1,
          type: 'system',
          text: msgText,
          results,
        };
      } else {
        systemMsg = {
          id: Date.now() + 1,
          type: 'system',
          text: `No results found for "${trimmedQuery}"${selectedLocation ? ' in the selected location' : ''}. Try a different search term, equipment code, or check the location filter.`,
          results: [],
        };
      }

      setMessages((prev) => [...prev, userMsg, systemMsg]);
      setInputValue('');
      setShowSuggestions(false);
      setSuggestions([]);
    },
    [ioData, selectedLocation]
  );

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        setActiveIndex(-1);
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        handleSuggestionSelect(suggestions[activeIndex]);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch(inputValue);
    }
  };

  const handleSuggestionSelect = (item) => {
    // Search by equipment code for exact results; fallback to name if no code
    const searchTerm = item.code || item.name;
    handleSearch(searchTerm);
  };

  const handleQuickSearch = (query) => {
    handleSearch(query);
    inputRef.current?.focus();
  };

  // Render message text with bold markdown
  const renderText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div style={styles.container}>
      {/* Messages Area */}
      <div style={styles.messagesArea}>
        {messages.length === 0 && !isLoading ? (
          <WelcomeMessage onQuickSearch={handleQuickSearch} />
        ) : isLoading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingDots}>
              <span style={{ ...styles.dot, animationDelay: '0s' }}>●</span>
              <span style={{ ...styles.dot, animationDelay: '0.2s' }}>●</span>
              <span style={{ ...styles.dot, animationDelay: '0.4s' }}>●</span>
            </div>
            <p style={styles.loadingText}>Loading I/O data...</p>
          </div>
        ) : null}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.messageRow,
              justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
              animation: 'slideUp 0.3s ease',
            }}
          >
            {msg.type === 'user' ? (
              <div style={styles.userBubble}>
                <span style={styles.userIcon}>🔍</span>
                {msg.text}
              </div>
            ) : (
              <div style={styles.systemMessage}>
                <div style={styles.systemBubble}>
                  <p style={styles.systemText}>{renderText(msg.text)}</p>
                </div>
                {msg.results && msg.results.length > 0 && (
                  <div style={styles.resultsGrid}>
                    {msg.results.map((result, idx) => (
                      <IOResultCard
                        key={`${result.equipmentCode}-${result.cabinet}-${idx}`}
                        result={result}
                        index={idx}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div style={styles.inputBar}>
        <div style={styles.inputWrapper}>
          <SearchSuggestions
            suggestions={suggestions}
            activeIndex={activeIndex}
            onSelect={handleSuggestionSelect}
            visible={showSuggestions}
          />
          <div style={styles.inputRow}>
            <input
              ref={inputRef}
              style={styles.input}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                // Delay to allow suggestion click
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              placeholder="Search equipment name, code, or I/O address..."
              disabled={isLoading || !ioData}
            />
            <button
              style={{
                ...styles.sendBtn,
                ...(inputValue.trim() ? styles.sendBtnActive : {}),
              }}
              onClick={() => handleSearch(inputValue)}
              disabled={!inputValue.trim() || isLoading}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    flex: 1,
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  userBubble: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    maxWidth: '70%',
    padding: '10px 18px',
    borderRadius: '18px 18px 4px 18px',
    background: 'linear-gradient(135deg, #cc1111, #990f0f)',
    color: 'white',
    fontSize: 14,
    fontWeight: 500,
    boxShadow: '0 4px 16px rgba(204, 17, 17, 0.2)',
  },
  userIcon: {
    fontSize: 14,
    flexShrink: 0,
  },
  systemMessage: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxWidth: '90%',
    width: '100%',
  },
  systemBubble: {
    padding: '12px 16px',
    borderRadius: '4px 18px 18px 18px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  systemText: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  resultsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  inputBar: {
    padding: '14px 24px 18px',
    background: 'var(--bg-primary)',
    borderTop: '1px solid var(--border-color)',
  },
  inputWrapper: {
    position: 'relative',
    maxWidth: 800,
    margin: '0 auto',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 6px 6px 18px',
    borderRadius: 'var(--radius-lg)',
    background: '#ffffff',
    border: '1px solid var(--border-color)',
    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08), var(--shadow-glow)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  input: {
    flex: 1,
    padding: '10px 0',
    fontSize: 14,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-family)',
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 'var(--radius-md)',
    background: 'rgba(204, 17, 17, 0.08)',
    color: 'var(--text-secondary)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  sendBtnActive: {
    background: 'linear-gradient(135deg, #cc1111, #990f0f)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(204, 17, 17, 0.25)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    gap: 16,
  },
  loadingDots: {
    display: 'flex',
    gap: 8,
  },
  dot: {
    fontSize: 18,
    color: 'var(--accent-blue)',
    animation: 'pulse 1.2s ease-in-out infinite',
  },
  loadingText: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
};
