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
