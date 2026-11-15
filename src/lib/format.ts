import { isApiError } from '@/lib/api-client';

/** Business timezone: days, "today" and receipt times are all in this zone. */
export const TIMEZONE: string = import.meta.env.VITE_BUSINESS_TIMEZONE || 'Africa/Nairobi';

const dateTime = new Intl.DateTimeFormat('en-KE', { timeZone: TIMEZONE, dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('en-KE', { timeZone: TIMEZONE, dateStyle: 'medium' });
const qtyFmt = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 3 });

export const fmtDateTime = (iso: string) => dateTime.format(new Date(iso));
/** Accepts a timestamp or a plain YYYY-MM-DD business date (which must not be shifted by timezone). */
export const fmtDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) ? dateOnly.format(new Date(`${v}T12:00:00Z`)) : dateOnly.format(new Date(v));
export const fmtQty = (n: number) => qtyFmt.format(n);

/** Today's date as YYYY-MM-DD in the business timezone. */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A readable message for any error, including the field problems the API reports. */
export function errorMessage(err: unknown): string {
  if (!isApiError(err)) return 'Something went wrong. Please try again.';
  const details = err.details;
  if (err.status === 422 && Array.isArray(details) && details.length > 0) {
    const first = details[0] as { path?: string; message?: string };
    return first.path ? `${first.path}: ${first.message}` : (first.message ?? err.message);
  }
  return err.message;
}

export const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
