import { Loader2, ShoppingBag } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { queryClient } from '@/app/queryClient';
import { useSessionStore } from '@/app/store/session';
import { useCartStore } from '@/features/pos/store/cart';
import { AuthShell } from '@/components/AuthShell';
import { Button, ErrorNotice, Field, Input } from '@/components/ui';
import { errorMessage } from '@/lib/format';
import { loginRequest } from '../api';

export function LoginPage() {
  const navigate = useNavigate();
  const signedIn = useSessionStore((s) => s.refreshToken !== null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (signedIn) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await loginRequest(email.trim(), password);
      const { businessId, setBusinessId, setTokens } = useSessionStore.getState();
      queryClient.clear(); // never show the previous user's cached data
      const keep = res.businesses.find((b) => b.id === businessId);
      const chosen = keep?.id ?? (res.businesses.length === 1 ? res.businesses[0]!.id : null);
      // A cart left over from another business or user must not be charged here.
      if (chosen !== businessId) useCartStore.getState().clear();
      setBusinessId(chosen);
      setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Shop" subtitle="Sign in to start selling." icon={ShoppingBag}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Email">{(p) => <Input {...p} className="bg-white/70" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Password">{(p) => <Input {...p} className="bg-white/70" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        {error && <ErrorNotice message={error} />}
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Sign in</Button>
      </form>
    </AuthShell>
  );
}
