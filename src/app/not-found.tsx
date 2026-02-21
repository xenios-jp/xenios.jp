import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-16 text-center">
      <h1 className="text-6xl font-bold tracking-tight text-text-primary">
        404
      </h1>
      <p className="mt-4 text-lg text-text-secondary">
        The page you&rsquo;re looking for doesn&rsquo;t exist.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-lg bg-accent px-6 py-3 text-[15px] font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        Back to home
      </Link>
    </div>
  );
}
