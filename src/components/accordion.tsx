"use client";

import { useRef, useState, useId, type KeyboardEvent } from "react";

interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function AccordionRow({ item }: { item: AccordionItem }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (open && event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div className="border-b border-border" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-[15px] font-medium text-text-primary transition-colors hover:text-text-primary"
      >
        {item.title}
        <ChevronIcon
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="pb-4 text-[15px] leading-relaxed text-text-secondary">{item.content}</div>
        </div>
      </div>
    </div>
  );
}

function slugifyTitle(title: string, fallback: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function Accordion({ items }: AccordionProps) {
  return (
    <div>
      {items.map((item, i) => (
        <AccordionRow
          key={`${slugifyTitle(item.title, `item-${i}`)}-${i}`}
          item={item}
        />
      ))}
    </div>
  );
}
