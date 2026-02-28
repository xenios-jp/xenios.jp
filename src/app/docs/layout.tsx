import Link from "next/link";
import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsMobileNav } from "@/components/docs-sidebar";

const docsNav = [
  { title: "Getting Started", slug: "getting-started" },
  { title: "Settings Reference", slug: "settings" },
  { title: "Troubleshooting", slug: "troubleshooting" },
  { title: "Reporting Bugs", slug: "reporting-bugs" },
  { title: "Developer Docs", slug: "developer" },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient border-b border-border pt-20 pb-12 md:pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Documentation
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            Choose iPhone/iPad or Mac to get the right steps.
          </p>
        </div>
      </section>

      <section className="py-4 border-b border-border bg-bg-surface/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border bg-bg-surface p-1">
              <Link
                href="/docs/ios/getting-started"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                iPhone / iPad
              </Link>
              <Link
                href="/docs/mac/getting-started"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Mac
              </Link>
            </div>
            <p className="text-sm text-text-secondary">
              One codebase, two builds. Use platform-specific instructions.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <DocsSidebar items={docsNav} />
            </div>
          </aside>

          {/* Mobile nav */}
          <div className="lg:hidden mb-6">
            <DocsMobileNav items={docsNav} />
          </div>

          {/* Main content */}
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
