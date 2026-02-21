"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-text-primary">
        Something went wrong
      </h1>
      <p className="mt-4 text-lg text-text-secondary">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-8 inline-flex items-center rounded-lg bg-accent px-6 py-3 text-[15px] font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}
