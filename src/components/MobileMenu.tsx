import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface MobileMenuProps<T extends string> {
  open: boolean;
  items: NavItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  onClose: () => void;
}

export function MobileMenu<T extends string>({
  open,
  items,
  active,
  onSelect,
  onClose,
}: MobileMenuProps<T>) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLButtonElement>('.mmenu-item.active')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLButtonElement>('button');
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="mmenu"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mmenu-title"
      ref={panelRef}
    >
      <header className="mmenu-header">
        <span id="mmenu-title" className="mmenu-title">
          Menu
        </span>
        <button type="button" className="mmenu-close" onClick={onClose} aria-label="Fechar menu">
          <X size={26} strokeWidth={2.5} />
        </button>
      </header>

      <nav aria-label="Seções do app">
        <ul className="mmenu-list">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isActive = item.id === active;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`mmenu-item ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                >
                  <span className="mmenu-num">.{String(idx + 1).padStart(2, '0')}</span>
                  <Icon size={26} strokeWidth={2.25} aria-hidden />
                  <span className="mmenu-label">{item.label}</span>
                  {item.count !== undefined && <span className="mmenu-count">{item.count}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export const MobileMenuButton = React.forwardRef<
  HTMLButtonElement,
  { onClick: () => void; currentLabel: string; expanded: boolean }
>(({ onClick, currentLabel, expanded }, ref) => (
  <button
    ref={ref}
    type="button"
    className="mmenu-trigger"
    onClick={onClick}
    aria-haspopup="dialog"
    aria-expanded={expanded}
    aria-label={`Menu — seção atual: ${currentLabel}`}
  >
    Menu
  </button>
));
MobileMenuButton.displayName = 'MobileMenuButton';
