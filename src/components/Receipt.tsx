import { useBusinessProfile } from '@/features/settings/api';
import { fmtDateTime, fmtQty, titleCase } from '@/lib/format';
import { formatKes } from '@/lib/money';
import type { Sale } from '@/lib/types';

/** Printable receipt. `window.print()` prints only `.print-area` (see index.css). */
export function Receipt({ sale }: { sale: Sale }) {
  const biz = useBusinessProfile().data;
  return (
    <div className="print-area mx-auto w-full max-w-xs font-mono text-xs leading-5">
      <div className="text-center">
        <p className="text-sm font-bold">{biz?.name ?? ''}</p>
        {biz?.address && <p>{biz.address}</p>}
        {biz?.phone && <p>Tel {biz.phone}</p>}
      </div>
      <hr className="my-2 border-dashed" />
      <p>Receipt #{sale.receiptNo}</p>
      <p>{fmtDateTime(sale.createdAt)}</p>
      <p>Served by {sale.cashierName}</p>
      {sale.status === 'voided' && <p className="my-1 text-center font-bold">*** VOIDED ***</p>}
      <hr className="my-2 border-dashed" />
      {sale.items.map((i) => (
        <div key={i.productId} className="mb-1">
          <p>{i.name}</p>
          <p className="flex justify-between">
            <span>{fmtQty(i.quantity)} × {formatKes(i.unitPriceCents)}</span>
            <span>{formatKes(i.lineTotalCents)}</span>
          </p>
        </div>
      ))}
      <hr className="my-2 border-dashed" />
      {sale.discountCents > 0 && (
        <>
          <p className="flex justify-between"><span>Subtotal</span><span>{formatKes(sale.subtotalCents)}</span></p>
          <p className="flex justify-between"><span>Discount</span><span>-{formatKes(sale.discountCents)}</span></p>
        </>
      )}
      <p className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{formatKes(sale.totalCents)}</span></p>
      {sale.payments.map((p, i) => (
        <p key={i} className="flex justify-between">
          <span>{p.method === 'mpesa' ? 'M-Pesa' : titleCase(p.method)}{p.reference ? ` (${p.reference})` : ''}</span>
          <span>{formatKes(p.amountCents)}</span>
        </p>
      ))}
      {sale.changeCents > 0 && <p className="flex justify-between"><span>Change given</span><span>{formatKes(sale.changeCents)}</span></p>}
      {biz?.receiptFooter && (
        <>
          <hr className="my-2 border-dashed" />
          <p className="text-center">{biz.receiptFooter}</p>
        </>
      )}
    </div>
  );
}
