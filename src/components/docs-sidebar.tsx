"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarItem {
  title: string;
  slug: string;
}

interface DocsSidebarProps {
  items: SidebarItem[];
}

export function DocsSidebar({ items }: DocsSidebarProps) {
  const pathname = usePathname();
  const platformPrefix = pathname.startsWith("/docs/mac/") ? "/docs/mac" : "/docs/ios";

  function isActiveSlug(slug: string) {
    return (
      pathname === `/docs/${slug}` ||
      pathname === `/docs/ios/${slug}` ||
      pathname === `/docs/mac/${slug}`
    );
  }

  return (
    <nav className="space-y-1">
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Documentation
      </p>
      {items.map((item) => {
        const isActive = isActiveSlug(item.slug);
        return (
          <Link
            key={item.slug}
            href={`${platformPrefix}/${item.slug}`}
            className={`block rounded-lg px-3 py-2 text-[15px] transition-colors ${
              isActive
                ? "bg-accent/10 text-accent font-medium border-l-2 border-accent -ml-px"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-surface-2/50"
            }`}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

export function DocsMobileNav({ items }: DocsSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const platformPrefix = pathname.startsWith("/docs/mac/") ? "/docs/mac" : "/docs/ios";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function isActiveSlug(slug: string) {
    return (
      pathname === `/docs/${slug}` ||
      pathname === `/docs/ios/${slug}` ||
      pathname === `/docs/mac/${slug}`
    );
  }

  const current = items.find((item) => isActiveSlug(item.slug));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-[15px] text-text-primary transition-colors"
      >
        <span>{current?.title ?? "Documentation"}</span>
        <svg
          className={`h-4 w-4 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-bg-surface p-1 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {items.map((item) => {
            const isActive = isActiveSlug(item.slug);
            return (
              <Link
                key={item.slug}
                href={`${platformPrefix}/${item.slug}`}
                className={`block rounded-md px-3 py-2 text-[15px] transition-colors ${
                  isActive
                    ? "text-accent font-medium bg-accent/10"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-surface-2/50"
                }`}
              >
                {item.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
