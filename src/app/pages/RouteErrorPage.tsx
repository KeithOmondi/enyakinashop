import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button } from '@/components/ui';

/** Shown when a route crashes while rendering, instead of a blank screen. */
export function RouteErrorPage() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : null;

  return (
    <main role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      {import.meta.env.DEV && detail && (
        <pre className="max-w-xl overflow-auto rounded bg-muted p-3 text-left text-xs">{detail}</pre>
      )}
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </main>
  );
}
