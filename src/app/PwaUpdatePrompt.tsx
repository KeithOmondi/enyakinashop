import { useEffect } from 'react';
import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';

// StrictMode runs effects twice in development; register the worker only once.
let registered = false;

/**
 * Registers the service worker. When a new version is deployed, asks before
 * reloading instead of reloading on its own, so a sale in progress is never cut off.
 */
export function PwaUpdatePrompt() {
  useEffect(() => {
    if (registered || !('serviceWorker' in navigator)) return;
    registered = true;
    const updateSW = registerSW({
      onNeedRefresh() {
        toast('A new version of the app is ready.', {
          id: 'pwa-update', // one toast, even if the check fires repeatedly
          description: 'Reload when you are not in the middle of a sale.',
          duration: Infinity,
          action: { label: 'Reload', onClick: () => void updateSW(true) },
        });
      },
      onRegisterError(error: unknown) {
        console.error('[pwa] service worker registration failed', error);
      },
    });
  }, []);
  return null;
}
