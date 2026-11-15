import { CheckCircle2, Loader2, Smartphone, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, ErrorNotice, Input } from '@/components/ui';
import { newIdempotencyKey } from '@/lib/api-client';
import { errorMessage } from '@/lib/format';
import { formatKes } from '@/lib/money';
import type { MpesaRequest } from '@/lib/types';
import { isFinal, useMpesaStatus, useSendPrompt } from '@/features/payments/api';

export interface PaidPrompt {
  id: string;
  receipt: string | null;
  phone: string;
  amountCents: number;
}

const SIM_HINT = 'Simulator: a number ending in 1 = customer cancels, 2 = no money, 3 = no answer. Any other number pays after a few seconds.';

/**
 * Sends an M-Pesa prompt to the customer's phone and waits for the result. Reports back once,
 * when the customer has paid. The server only marks a prompt paid after Safaricom confirms it,
 * so a "paid" here is real money, not a typed code.
 */
export function MpesaPrompt({
  amountCents,
  simulator,
  onPaid,
}: {
  amountCents: number | null;
  simulator: boolean;
  onPaid: (p: PaidPrompt) => void;
}) {
  const send = useSendPrompt();
  const [phone, setPhone] = useState(() => {
    try { return sessionStorage.getItem('shop.lastPhone') ?? ''; } catch { return ''; }
  });
  const [requestId, setRequestId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const status = useMpesaStatus(requestId);
  const req: MpesaRequest | undefined = status.data;
  const reported = useRef(false);

  const wholeShillings = amountCents !== null && amountCents >= 100 && amountCents % 100 === 0;
  const waiting = requestId !== null && (!req || req.status === 'pending');

  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [waiting]);

  useEffect(() => {
    if (req?.status === 'paid' && !reported.current && amountCents !== null) {
      reported.current = true;
      onPaid({ id: req.id, receipt: req.receipt, phone: req.phone, amountCents: req.amountCents });
    }
  }, [req, amountCents, onPaid]);

  function submit() {
    if (!wholeShillings || amountCents === null) return;
    try { sessionStorage.setItem('shop.lastPhone', phone); } catch { /* private mode: not needed */ }
    send.mutate(
      { phone: phone.trim(), amountCents, requestKey: newIdempotencyKey() },
      {
        onSuccess: (r) => {
          reported.current = false;
          setRequestId(r.id);
          setStartedAt(Date.now());
          setNow(Date.now());
        },
      },
    );
  }

  const reset = () => { setRequestId(null); send.reset(); };

  if (waiting) {
    const secs = Math.max(0, Math.round((now - startedAt) / 1000));
    return (
      <div role="status" className="flex flex-col gap-2 rounded-lg bg-muted p-3 text-sm">
        <p className="flex items-center gap-2 font-medium"><Loader2 className="size-4 animate-spin" aria-hidden /> Waiting for the customer to enter their M-Pesa PIN… ({secs}s)</p>
        <p className="text-muted-foreground">A prompt for {amountCents !== null ? formatKes(amountCents) : ''} was sent to {req?.phone ?? 'their phone'}.</p>
        <Button variant="outline" className="min-h-9 self-start" onClick={reset}>Stop waiting</Button>
        <p className="text-xs text-muted-foreground">If the customer already approved, wait a moment: the screen updates by itself.</p>
      </div>
    );
  }

  if (req?.status === 'paid') {
    return (
      <p role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm font-medium text-success">
        <CheckCircle2 className="size-5" aria-hidden /> Paid{req.receipt ? ` · ${req.receipt}` : ''}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {req && isFinal(req.status) && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {req.resultDesc ?? 'The payment was not completed'}
        </p>
      )}
      <div className="flex gap-2">
        <Input aria-label="Customer's M-Pesa number" inputMode="tel" autoComplete="off" placeholder="Customer's number, e.g. 0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button disabled={!wholeShillings || phone.replace(/\D/g, '').length < 9 || send.isPending} onClick={submit}>
          {send.isPending ? <Loader2 className="animate-spin" /> : <Smartphone />} {req ? 'Send again' : 'Send prompt'}
        </Button>
      </div>
      {amountCents !== null && !wholeShillings && (
        <p className="text-xs text-destructive">M-Pesa takes whole shillings. Enter a whole amount here and take the cents in cash.</p>
      )}
      {amountCents === null && <p className="text-xs text-muted-foreground">Enter the M-Pesa amount first.</p>}
      {send.isError && <ErrorNotice message={errorMessage(send.error)} />}
      {simulator && <p className="text-xs text-warning">{SIM_HINT}</p>}
    </div>
  );
}
