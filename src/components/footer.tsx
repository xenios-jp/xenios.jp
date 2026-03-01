import Link from "next/link";
import { WEBSITE_GITHUB_URL, KOFI_URL } from "@/lib/constants";

const footerLinks = [
  { label: "Legal/Disclaimer", href: "/legal" },
  { label: "License", href: "/license" },
  { label: "Credits", href: "/credits" },
  { label: "Privacy", href: "/privacy" },
  {
    label: "GitHub",
    href: WEBSITE_GITHUB_URL,
    external: true,
  },
  { label: "Discord", href: "https://discord.gg/xenios", external: true },
  { label: "Support", href: KOFI_URL, external: true },
];

export function Footer() {
  return (
    <footer className="bg-bg-surface border-t border-border">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {footerLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] text-text-muted transition-colors hover:text-text-primary"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="text-[15px] text-text-muted transition-colors hover:text-text-primary"
              >
                {link.label}
              </Link>
            )
          )}
        </div>
        <p className="mt-8 text-center text-sm text-text-muted">
          XeniOS is the Apple-platform port of Xenia, the Xbox 360 Emulation Research Project (iPhone, iPad, and Mac). No games are included.
        </p>
      </div>
    </footer>
  );
}
