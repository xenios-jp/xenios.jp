import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-16 text-center">
      <h1 className="text-6xl font-bold tracking-tight text-text-primary">
        404
      </h1>
      <p className="mt-4 max-w-md text-lg text-text-secondary">
        The page you&rsquo;re looking for doesn&rsquo;t exist, or has moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg bg-accent px-6 py-3 text-[15px] font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Back to home
        </Link>
        <Link
          href="/compatibility"
          className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-surface-2"
        >
          Browse compatibility
        </Link>
        <Link
          href="/docs"
          className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-surface-2"
        >
          Read the docs
        </Link>
      </div>
    </div>
  );
}
