import { Building2 } from 'lucide-react';
import { useSessionStore } from '@/app/store/session';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui';
import { titleCase } from '@/lib/format';
import type { Business } from '@/lib/types';

/** For users who belong to several businesses: which one is this till for? */
export function SelectBusinessPage({ businesses }: { businesses: Business[] }) {
  const setBusinessId = useSessionStore((s) => s.setBusinessId);
  const signOut = useSessionStore((s) => s.clear);

  return (
    <AuthShell title="Which business?" subtitle="Choose the one this till is for." icon={Building2}>
      {businesses.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Your account is not assigned to any business yet. Ask an administrator.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {businesses.map((b) => (
            <li key={b.id}>
              <Button variant="outline" className="h-auto min-h-14 w-full justify-between bg-white/70 py-3 text-base hover:bg-white" onClick={() => setBusinessId(b.id)}>
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-muted-foreground">{titleCase(b.role)}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="ghost" className="mt-3 w-full" onClick={signOut}>Sign out</Button>
    </AuthShell>
  );
}
