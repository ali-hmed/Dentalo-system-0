'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-background text-foreground font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-page-title font-medium text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-body text-muted mb-6">
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
