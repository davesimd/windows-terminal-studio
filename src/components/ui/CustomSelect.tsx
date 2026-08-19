import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  width = "260px",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div
      className={`modern-select-container ${isOpen ? "open" : ""}`}
      ref={containerRef}
      style={{ width }}
    >
      {/* Select Trigger Button */}
      <button
        type="button"
        className="modern-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="trigger-label-group">
          {selectedOption?.icon && <span className="trigger-icon">{selectedOption.icon}</span>}
          <span className="trigger-text">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={14}
          className={`trigger-chevron ${isOpen ? "rotated" : ""}`}
        />
      </button>

      {/* Dropdown Options Popup */}
      {isOpen && (
        <div className="modern-select-menu animate-fade" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                className={`modern-select-option ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                role="option"
                aria-selected={isSelected}
              >
                <div className="option-left">
                  {opt.icon && <span className="option-icon">{opt.icon}</span>}
                  <div className="option-text-group">
                    <span className="option-label">{opt.label}</span>
                    {opt.sublabel && <span className="option-sublabel">{opt.sublabel}</span>}
                  </div>
                </div>

                {isSelected && <Check size={14} className="option-check text-indigo-400" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
