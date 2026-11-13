import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  Children,
  isValidElement,
  type SelectHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type MutableRefObject,
} from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FIELD_CLASSES, FIELD_ERROR_CLASSES, FieldLabel } from './Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  /** Renders a trailing accent-coloured `*` after the label and sets `aria-required`. */
  required?: boolean;
}

interface OptionMeta {
  value: string;
  label: string;
  disabled: boolean;
}

/** Flattens an <option>'s children (plain text, numbers, `{a} {b}`, conditional strings...) into display text. */
function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (isValidElement(node)) return nodeToText((node.props as { children?: ReactNode }).children);
  return '';
}

function readOptions(children: ReactNode): OptionMeta[] {
  const out: OptionMeta[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== 'option') return;
    const p = child.props as { value?: string | number | readonly string[]; children?: ReactNode; disabled?: boolean };
    out.push({
      value: p.value === undefined ? '' : String(p.value),
      label: nodeToText(p.children).trim(),
      disabled: !!p.disabled,
    });
  });
  return out;
}

/**
 * A REAL native <select> stays in the DOM (so `register()`, controlled `value`/`onChange`, forms
 * and the a11y tree all keep working with zero call-site changes) but the OPEN option list is our
 * own styled panel, not the browser's native popup.
 *
 * Why: verified in a real browser (Chrome, both themes) that the native popup does not reliably
 * pick up the app's day/night tokens - `color-scheme` + explicit `<option>` colors still rendered
 * a near-white popup in night theme, i.e. exactly the "unreadable" bug report. Browsers don't let
 * CSS fully restyle the native popup, so we intercept opening (preventDefault on mousedown /
 * navigation keys) and render our own `role="listbox"` panel instead, then commit the choice back
 * onto the native element with a real `change` event so every existing onChange/register consumer
 * is unaffected.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, required, className, id, children, disabled, onBlur, value, defaultValue, ...props }, forwardedRef) => {
    // Always derive the fallback id from useId() (never from the label text alone) - two Select
    // instances with the same label (e.g. a filter bar and a modal both having "Country") must not
    // collide in the DOM, which breaks `<label for>` association for one of them.
    const autoId = useId();
    const selectId = id ?? autoId;
    const messageId = `${selectId}-msg`;
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const nodeRef = useRef<HTMLSelectElement | null>(null);
    const typeaheadRef = useRef('');
    const typeaheadTimer = useRef<number | undefined>(undefined);

    const options = useMemo(() => readOptions(children), [children]);
    const currentDomValue = nodeRef.current?.value ?? '';

    const setRefs = (node: HTMLSelectElement | null) => {
      nodeRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) (forwardedRef as MutableRefObject<HTMLSelectElement | null>).current = node;
    };

    // Close on outside click/tap.
    useEffect(() => {
      if (!open) return;
      const onDocDown = (e: PointerEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('pointerdown', onDocDown);
      return () => document.removeEventListener('pointerdown', onDocDown);
    }, [open]);

    // Highlight the current selection whenever the panel opens.
    useEffect(() => {
      if (!open) return;
      const cur = nodeRef.current?.value ?? '';
      const idx = options.findIndex((o) => o.value === cur);
      setHighlighted(idx >= 0 ? idx : options.findIndex((o) => !o.disabled));
    }, [open, options]);

    const firstEnabledIndex = () => options.findIndex((o) => !o.disabled);
    const lastEnabledIndex = () => {
      for (let i = options.length - 1; i >= 0; i--) if (!options[i].disabled) return i;
      return -1;
    };
    const nextEnabledIndex = (from: number, dir: 1 | -1) => {
      if (options.length === 0) return from;
      let i = from;
      for (let step = 0; step < options.length; step++) {
        i = i + dir;
        if (i < 0) i = options.length - 1;
        if (i >= options.length) i = 0;
        if (!options[i].disabled) return i;
      }
      return from;
    };

    const commit = (idx: number) => {
      const opt = options[idx];
      const node = nodeRef.current;
      if (!opt || opt.disabled || !node) return;
      node.value = opt.value;
      node.dispatchEvent(new Event('change', { bubbles: true }));
      setOpen(false);
      node.focus();
    };

    const handleMouseDown = (e: ReactMouseEvent<HTMLSelectElement>) => {
      if (disabled) return;
      e.preventDefault();
      nodeRef.current?.focus();
      setOpen((o) => !o);
    };

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLSelectElement>) => {
      if (disabled) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!open) setOpen(true);
        else setHighlighted((h) => nextEnabledIndex(h, 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) setOpen(true);
        else setHighlighted((h) => nextEnabledIndex(h, -1));
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (open) commit(highlighted);
        else setOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      }
      if (e.key === 'Home') {
        if (open) {
          e.preventDefault();
          setHighlighted(firstEnabledIndex());
        }
        return;
      }
      if (e.key === 'End') {
        if (open) {
          e.preventDefault();
          setHighlighted(lastEnabledIndex());
        }
        return;
      }
      if (e.key === 'Tab') {
        setOpen(false);
        return;
      }
      if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        window.clearTimeout(typeaheadTimer.current);
        typeaheadRef.current += e.key.toLowerCase();
        const needle = typeaheadRef.current;
        const match = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(needle));
        if (match >= 0) {
          if (open) setHighlighted(match);
          else commit(match);
        }
        typeaheadTimer.current = window.setTimeout(() => {
          typeaheadRef.current = '';
        }, 600);
      }
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <FieldLabel htmlFor={selectId} required={required}>
            {label}
          </FieldLabel>
        )}
        <div ref={wrapRef} className="relative">
          <select
            id={selectId}
            ref={setRefs}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            aria-invalid={error ? true : undefined}
            aria-required={required ? true : undefined}
            aria-describedby={error ? messageId : undefined}
            aria-expanded={open}
            aria-haspopup="listbox"
            onMouseDown={handleMouseDown}
            onKeyDown={handleKeyDown}
            onBlur={(e) => {
              // Deferred so a mousedown on a panel option (which calls preventDefault) still commits before we close.
              window.setTimeout(() => setOpen(false), 0);
              onBlur?.(e);
            }}
            className={cn(FIELD_CLASSES, 'cursor-pointer appearance-none pr-8', error && FIELD_ERROR_CLASSES, className)}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted transition-transform',
              open && 'rotate-180',
            )}
          />
          {open && !disabled && options.length > 0 && (
            <ul
              role="listbox"
              tabIndex={-1}
              aria-activedescendant={options[highlighted] ? `${selectId}-opt-${highlighted}` : undefined}
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-auto rounded-lg border border-line bg-surface p-1 shadow-pop animate-pop-in"
            >
              {options.map((opt, idx) => {
                const selected = currentDomValue === opt.value;
                const active = idx === highlighted;
                return (
                  <li
                    key={`${opt.value}-${idx}`}
                    id={`${selectId}-opt-${idx}`}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={opt.disabled || undefined}
                    onMouseEnter={() => !opt.disabled && setHighlighted(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!opt.disabled) commit(idx);
                    }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm',
                      opt.disabled && 'cursor-not-allowed opacity-50',
                      !opt.disabled && active && 'bg-primary text-on-primary',
                      !opt.disabled && !active && 'text-ink hover:bg-surface-2',
                    )}
                  >
                    <span className="truncate">{opt.label || ' '}</span>
                    {selected && (
                      <Check aria-hidden="true" className={cn('h-4 w-4 shrink-0', active ? 'text-on-primary' : 'text-primary')} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {error && (
          <span id={messageId} className="text-xs font-medium text-red-600">
            {error}
          </span>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';
