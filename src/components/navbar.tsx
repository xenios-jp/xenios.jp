"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { EMULATOR_GITHUB_URL, KOFI_URL } from "@/lib/constants";

const navLinks = [
  { label: "Download", href: "/download" },
  { label: "Compatibility", href: "/compatibility" },
  { label: "Docs", href: "/docs" },
  { label: "FAQ", href: "/faq" },
  { label: "Changelog", href: "/changelog" },
];

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M13.55 3.15A13.27 13.27 0 0010.21 2a9.85 9.85 0 00-.43.88 12.3 12.3 0 00-3.57 0A9.4 9.4 0 005.78 2 13.36 13.36 0 002.44 3.15 13.85 13.85 0 00.21 11.84a13.4 13.4 0 004.04 2.04 10.06 10.06 0 00.87-1.41 8.7 8.7 0 01-1.37-.66c.11-.08.22-.17.33-.26a9.56 9.56 0 008.18 0c.1.09.22.18.33.26-.44.26-.9.48-1.38.66.25.5.54.97.87 1.41a13.35 13.35 0 004.04-2.04 13.82 13.82 0 00-2.23-8.69zM5.35 10.18c-.75 0-1.37-.7-1.37-1.55 0-.86.6-1.56 1.37-1.56.76 0 1.38.7 1.37 1.56 0 .86-.61 1.55-1.37 1.55zm5.3 0c-.76 0-1.37-.7-1.37-1.55 0-.86.6-1.56 1.37-1.56.76 0 1.37.7 1.37 1.56 0 .86-.61 1.55-1.37 1.55z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7.655 14.916v-.001h-.002l-.006-.003-.018-.01a7.643 7.643 0 01-.245-.144 15.46 15.46 0 01-2.734-2.138C2.93 10.88 1.5 8.836 1.5 6.168c0-2.394 1.886-4.168 3.9-4.168 1.182 0 2.244.57 2.6 1.478.356-.908 1.418-1.478 2.6-1.478 2.014 0 3.9 1.774 3.9 4.168 0 2.668-1.43 4.712-3.15 6.452a15.46 15.46 0 01-2.734 2.138 8.758 8.758 0 01-.263.154l-.006.003h-.002l-.345-.192.345.192z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="fixed top-0 z-50 w-full bg-bg-primary/80 backdrop-blur-md border-b border-border">
      <nav className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-text-primary"
        >
          XeniOS
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`px-3 py-2 text-[15px] transition-colors ${
                  pathname.startsWith(link.href)
                    ? "text-accent font-medium"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop right icons */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href={EMULATOR_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-text-secondary transition-colors hover:text-text-primary"
            aria-label="GitHub"
          >
            <GitHubIcon className="h-[18px] w-[18px]" />
          </a>
          <a
            href="https://discord.gg/xenios"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-text-secondary transition-colors hover:text-text-primary"
            aria-label="Discord"
          >
            <DiscordIcon className="h-[18px] w-[18px]" />
          </a>
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-text-secondary transition-colors hover:text-pink-500"
            aria-label="Support on Ko-fi"
          >
            <HeartIcon className="h-[18px] w-[18px]" />
          </a>
          <ThemeToggle />
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden p-2 text-text-secondary hover:text-text-primary"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <CloseIcon className="h-5 w-5" />
          ) : (
            <MenuIcon className="h-5 w-5" />
          )}
        </button>
      </nav>

      {/* Mobile slide-down panel */}
      <div
        className={`md:hidden border-t border-border bg-bg-primary/95 backdrop-blur-md overflow-hidden transition-[max-height,opacity] duration-200 ${
          mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
          <div className="mx-auto max-w-[1280px] px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  pathname.startsWith(link.href)
                    ? "text-accent font-medium bg-accent/5"
                    : "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-4 px-3 pt-3 border-t border-border mt-3">
          <a
            href={EMULATOR_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary transition-colors hover:text-text-primary"
                aria-label="GitHub"
              >
                <GitHubIcon className="h-5 w-5" />
              </a>
              <a
                href="https://discord.gg/xenios"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary transition-colors hover:text-text-primary"
                aria-label="Discord"
              >
                <DiscordIcon className="h-5 w-5" />
              </a>
              <a
                href={KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary transition-colors hover:text-pink-500"
                aria-label="Support on Ko-fi"
              >
                <HeartIcon className="h-5 w-5" />
              </a>
              <ThemeToggle />
            </div>
          </div>
      </div>
    </header>
  );
}
