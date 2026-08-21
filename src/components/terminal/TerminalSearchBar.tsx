import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  ChevronUp, 
  ChevronDown, 
  X, 
  CaseSensitive, 
  WholeWord, 
  Regex 
} from "lucide-react";

export interface SearchOptionsState {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

interface TerminalSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  onFindNext: (query: string, options: SearchOptionsState, incremental?: boolean) => void;
  onFindPrevious: (query: string, options: SearchOptionsState) => void;
  onClearSearch: () => void;
  matchResult?: {
    resultIndex: number;
    resultCount: number;
  } | null;
}

export default function TerminalSearchBar({
  isOpen,
  onClose,
  onFindNext,
  onFindPrevious,
  onClearSearch,
  matchResult,
}: TerminalSearchBarProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchOptionsState>({
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Validate regex if regex option is active
  const isInvalidRegex = React.useMemo(() => {
    if (!options.regex || !query) return false;
    try {
      new RegExp(query);
      return false;
    } catch {
      return true;
    }
  }, [query, options.regex]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery("");
      onClearSearch();
    }
  }, [isOpen]);

  // Trigger search on query or option change
  useEffect(() => {
    if (!isOpen) return;
    if (query) {
      if (options.regex && isInvalidRegex) {
        onClearSearch();
        return;
      }
      onFindNext(query, options, true);
    } else {
      onClearSearch();
    }
  }, [query, options, isOpen, isInvalidRegex]);

  // Global escape key handler when search is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      e.stopPropagation();
      inputRef.current?.select();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!query || (options.regex && isInvalidRegex)) return;
      if (e.shiftKey) {
        onFindPrevious(query, options);
      } else {
        onFindNext(query, options, false);
      }
    }
  };

  const hasMatches = Boolean(matchResult && matchResult.resultCount > 0);
  const isNoResults = Boolean(query.length > 0 && !isInvalidRegex && matchResult && matchResult.resultCount === 0);

  return (
    <div 
      className="terminal-search-widget"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Input Container */}
      <div className="terminal-search-input-wrap">
        <Search size={13} className="terminal-search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in terminal..."
          className="terminal-search-input"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onClearSearch();
              inputRef.current?.focus();
            }}
            className="terminal-search-clear-btn"
            title="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Match Status Badge */}
      {query.length > 0 && (
        <div 
          className={`terminal-search-counter ${
            isInvalidRegex ? "no-matches" : hasMatches ? "has-matches" : isNoResults ? "no-matches" : "empty"
          }`}
        >
          {isInvalidRegex ? (
            <span>Invalid regex</span>
          ) : hasMatches && matchResult ? (
            <span>
              {matchResult.resultIndex >= 0 ? matchResult.resultIndex + 1 : 1}/{matchResult.resultCount}
            </span>
          ) : isNoResults ? (
            <span>0 matches</span>
          ) : (
            <span>...</span>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="terminal-search-btn-group">
        <button
          type="button"
          onClick={() => query && !isInvalidRegex && onFindPrevious(query, options)}
          disabled={!query || Boolean(isNoResults) || isInvalidRegex}
          className="terminal-search-action-btn"
          title="Previous Match (Shift+Enter)"
          aria-label="Previous Match"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => query && !isInvalidRegex && onFindNext(query, options, false)}
          disabled={!query || Boolean(isNoResults) || isInvalidRegex}
          className="terminal-search-action-btn"
          title="Next Match (Enter)"
          aria-label="Next Match"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="terminal-search-divider" />

      {/* Search Filter Toggles */}
      <div className="terminal-search-btn-group">
        <button
          type="button"
          onClick={() => setOptions((prev) => ({ ...prev, caseSensitive: !prev.caseSensitive }))}
          className={`terminal-search-action-btn ${options.caseSensitive ? "active" : ""}`}
          title="Match Case (Alt+C)"
          aria-label="Match Case"
        >
          <CaseSensitive size={14} />
        </button>
        <button
          type="button"
          onClick={() => setOptions((prev) => ({ ...prev, wholeWord: !prev.wholeWord }))}
          className={`terminal-search-action-btn ${options.wholeWord ? "active" : ""}`}
          title="Match Whole Word (Alt+W)"
          aria-label="Match Whole Word"
        >
          <WholeWord size={14} />
        </button>
        <button
          type="button"
          onClick={() => setOptions((prev) => ({ ...prev, regex: !prev.regex }))}
          className={`terminal-search-action-btn ${options.regex ? "active" : ""}`}
          title="Use Regular Expression (Alt+R)"
          aria-label="Use Regular Expression"
        >
          <Regex size={14} />
        </button>
      </div>

      <div className="terminal-search-divider" />

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="terminal-search-action-btn"
        title="Close search (Esc)"
        aria-label="Close search"
      >
        <X size={14} />
      </button>
    </div>
  );
}
