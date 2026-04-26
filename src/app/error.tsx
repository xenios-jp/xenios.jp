"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the browser console so it shows up in
    // Cloudflare/RUM and developer tooling. Production minified errors
    // include `digest` so the same id can be cross-referenced in logs.
    if (error.digest) {
      console.error(`[error.tsx] digest=${error.digest}`, error);
    } else {
      console.error("[error.tsx]", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-text-primary">
        Something went wrong
      </h1>
      <p className="mt-4 text-lg text-text-secondary">
        An unexpected error occurred. Please try again, and if it keeps
        happening, let us know in Discord.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-text-muted">
          Error reference: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-8 inline-flex items-center rounded-lg bg-accent px-6 py-3 text-[15px] font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}
