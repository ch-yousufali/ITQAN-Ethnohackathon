"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type SelectOption = {
  value: string;
  label: string;
  /** Secondary text, such as a date or confidence. */
  detail?: string;
  /** Options sharing a group appear under one heading. Keep them adjacent. */
  group?: string;
  /** Sets the label as a Latin binomial, in the serif face. */
  botanical?: boolean;
};

const POPUP_MAX_HEIGHT = 288;

function OptionText({ option }: { option: SelectOption }) {
  return (
    <span className={option.botanical ? "font-serif text-[15px] italic" : undefined}>{option.label}</span>
  );
}

/** A styled single-select following the ARIA select-only combobox pattern. */
export function Select({
  id,
  value,
  onChange,
  onBlur,
  options,
  placeholder = "Select",
  disabled,
  className = "",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}) {
  const baseId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [above, setAbove] = useState(false);

  const selected = options.find((o) => o.value === value);
  const optionId = (i: number) => `${baseId}-option-${i}`;

  function show() {
    const rect = button.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setAbove(below < POPUP_MAX_HEIGHT && rect.top > below);
    }
    setActive(Math.max(options.findIndex((o) => o.value === value), 0));
    setOpen(true);
  }

  function choose(i: number) {
    const option = options[i];
    if (option && option.value !== value) onChange(option.value);
    setOpen(false);
    button.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the highlighted option in view during keyboard navigation.
  useEffect(() => {
    if (open) list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function typeAhead(key: string) {
    const now = Date.now();
    const text = now - typed.current.at > 600 ? key : typed.current.text + key;
    typed.current = { text, at: now };
    const match = options.findIndex((o) => o.label.toLowerCase().startsWith(text.toLowerCase()));
    if (match >= 0) setActive(match);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Tab") {
      if (open) choose(active);
      return;
    }
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, options.length - 1),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: options.length - 1,
    };
    if (e.key in moves) {
      e.preventDefault();
      setActive(moves[e.key]);
    } else if (e.key === "Enter" || (e.key === " " && !typed.current.text)) {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key.length === 1 && e.key !== " ") {
      typeAhead(e.key);
    }
  }

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${baseId}-list`}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border bg-surface py-2 pr-3 pl-3 text-left text-sm transition-colors hover:border-muted focus-visible:outline-offset-0 focus-visible:outline-leaf/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "border-leaf" : "border-line-strong"
        }`}
      >
        <span className="min-w-0 truncate">
          {selected ? (
            <>
              <OptionText option={selected} />
              {selected.detail && <span className="text-muted"> · {selected.detail}</span>}
            </>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <ul
          ref={list}
          id={`${baseId}-list`}
          role="listbox"
          aria-label={ariaLabel}
          style={{ maxHeight: POPUP_MAX_HEIGHT }}
          className={`absolute right-0 left-0 z-20 min-w-full animate-pop overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-[0_8px_24px_rgb(27_38_32/0.1)] ${
            above ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top"
          }`}
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            const heading = option.group && option.group !== options[i - 1]?.group ? option.group : null;
            return (
              <li key={option.value} role="none">
                {heading && (
                  <div role="presentation" className="px-2.5 pt-2.5 pb-1 text-xs font-medium text-muted">
                    {heading}
                  </div>
                )}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  data-active={i === active}
                  onPointerMove={() => setActive(i)}
                  // Keep focus on the button, so the popup does not close before the click lands.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  className={`flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm ${
                    i === active ? "bg-subtle" : ""
                  } ${isSelected ? "font-medium text-leaf-dark" : "text-ink"}`}
                >
                  <span className="min-w-0">
                    <OptionText option={option} />
                    {option.detail && <span className="block text-[13px] font-normal text-muted">{option.detail}</span>}
                  </span>
                  {isSelected && <Check className="size-4 shrink-0 text-leaf" aria-hidden />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
