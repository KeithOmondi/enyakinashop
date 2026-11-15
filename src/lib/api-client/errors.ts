import axios, { type AxiosError } from 'axios';

/**
 * Every failed request is rejected with an ApiError, so UI code handles one shape:
 *   status 0     -> no response (offline, DNS, CORS, timeout); see `code`
 *   status 4xx   -> the server refused; `code` is the server's error code
 *   status 5xx   -> server fault
 * The server's body is { error: { code, message, details? } } (server/src/middleware/errorHandler.ts).
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

interface ServerErrorBody {
  error?: { code?: unknown; message?: unknown; details?: unknown };
}

export function toApiError(error: unknown): unknown {
  if (error instanceof ApiError) return error;
  // Cancelled requests are not failures; callers (e.g. TanStack Query) need the original.
  if (!axios.isAxiosError(error) || axios.isCancel(error)) return error;

  const err = error as AxiosError<ServerErrorBody>;
  if (!err.response) {
    const timedOut = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
    return new ApiError(
      0,
      timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
      timedOut
        ? 'The server took too long to respond. Please try again.'
        : 'Cannot reach the server. Check your connection and try again.',
    );
  }

  const { status, data, statusText } = err.response;
  const body = data && typeof data === 'object' ? data.error : undefined;
  const code = typeof body?.code === 'string' ? body.code : 'HTTP_ERROR';
  const message =
    typeof body?.message === 'string'
      ? body.message
      : status >= 500
        ? 'Something went wrong on the server. Please try again.'
        : statusText || `Request failed (${status})`;
  return new ApiError(status, code, message, body?.details);
}
