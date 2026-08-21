# Modal & Dialog Implementation Guide

This guide establishes the architectural standards, accessibility requirements, and component patterns for creating modals and dialog overlays in **Windows Terminal Studio**.

---

## 1. Mandatory Requirements

Whenever adding or modifying any modal, drawer, or full overlay dialog in the application, the following requirements **must** be met:

### 1.1 Escape Key Dismissal (MANDATORY)
> **Important**: **Every modal MUST support closing via the `Escape` key.**
> Users navigating via keyboard or quickly dismissing dialogs rely on `Escape` for standard desktop app UX.

- Register a `keydown` event listener when `isOpen` is `true`.
- Always clean up the event listener in the `useEffect` cleanup return.
- If multiple layers or sub-menus exist, ensure event propagation is handled predictably.

#### Standard Escape Key Listener Pattern:
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
      onClose();
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [isOpen, onClose]);
```

---

### 1.2 Backdrop Click to Dismiss
- Clicking on the outer darkened backdrop (`modal-backdrop`) must trigger `onClose()`.
- The inner modal container must stop event propagation (`onClick={(e) => e.stopPropagation()}`) to avoid accidental dismissals when interacting with modal content.

---

### 1.3 Close Button
- Every modal must include a visible close button (typically using `<X size={18} />` from `lucide-react`) in the top-right header area.
- Provide a clear title, icon badge, and descriptive subtitle/description in the header where applicable.

---

## 2. Standard Modal Component Template

Below is the recommended boilerplate for creating a new standalone modal component in `src/components/`:

```tsx
import React, { useEffect } from "react";
import { X, LucideIcon } from "lucide-react";

export interface StandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

export const StandardModal: React.FC<StandardModalProps> = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
}) => {
  // 1. Mandatory Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container max-w-xl w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-sage/10 text-sage">
                <Icon size={18} />
              </div>
            )}
            <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Close (Esc)"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body p-5 overflow-y-auto max-h-[75vh]">
          {children}
        </div>
      </div>
    </div>
  );
};
```

---

## 3. Inline Page Modals Pattern

If a modal is implemented directly within a page (such as `ScratchpadPage.tsx`), adhere to the same requirements:

```tsx
// In component state:
const [isModalOpen, setIsModalOpen] = useState(false);

// Mandatory Escape handler in page:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isModalOpen) {
      setIsModalOpen(false);
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [isModalOpen]);

// In JSX return:
{isModalOpen && (
  <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        {/* Header content & close button */}
        <button onClick={() => setIsModalOpen(false)}>
          <X size={18} />
        </button>
      </div>
      <div className="modal-body">
        {/* Modal content */}
      </div>
    </div>
  </div>
)}
```

---

## 4. UI & Styling Guidelines

- **Backdrop**: Standard CSS class `.modal-backdrop` (`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4`).
- **Z-Index Layering**:
  - Regular modals: `z-50`
  - Nested confirmation popups / dropdowns inside modals: `z-60` or above
  - Toast notifications: `z-[100]`
- **Scroll Behavior**: Constrain body height with `max-h-[70vh]` or `max-h-[80vh]` and `overflow-y-auto` to prevent modals from exceeding the viewport.
- **Inputs & Form Controls**: Use `.modal-input` and `.modal-label` utility classes for unified styling across dark theme palettes.

---

## 5. Pre-Commit Checklist for New Modals

- [ ] Escape key dismisses the modal (`e.key === "Escape"`).
- [ ] Backdrop click closes the modal.
- [ ] Inner modal container calls `e.stopPropagation()`.
- [ ] Header has an `X` icon button with `aria-label="Close"`.
- [ ] Event listeners are properly cleaned up on unmount or when `isOpen` becomes `false`.
- [ ] Scrollbars inside modal body match the application's dark scrollbar styling.
