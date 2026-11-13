import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  id: string;
  label: ReactNode;
  /** Small count pill (e.g. number of rows in that filter). */
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
}

/**
 * Segmented tab / filter bar (roving tabindex, arrow keys, Home/End). Pair each tab with a panel via
 * `id={`tab-${id}`}` / `aria-controls` if you render separate panels; for plain filters it works as is.
 */
export function Tabs({ tabs, value, onChange, label, className }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.id === value);
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1', className)}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all',
              selected ? 'bg-surface text-slate-900 shadow-card' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  selected ? 'bg-primary text-on-primary' : 'bg-slate-200 text-slate-700',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
