export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-page-title font-medium text-foreground mb-2">
          Page not found
        </h1>
        <p className="text-body text-muted mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Go to login
        </a>
      </div>
    </div>
  );
}
