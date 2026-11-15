import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ApiError, toApiError } from './errors';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Do not try to refresh the session if this request gets a 401. */
    skipAuthRefresh?: boolean;
  }
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** How the client reads and updates the app's session (each app owns its own store). */
export interface SessionAdapter {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (tokens: Tokens) => void;
  getBusinessId: () => string | null;
  clearSession: () => void;
}

export interface ApiClientOptions {
  baseURL: string;
  session: SessionAdapter;
  /** Endpoint that exchanges a refresh token for new tokens. Body: { refreshToken }. */
  refreshPath?: string;
  timeoutMs?: number;
}

export interface ApiClient {
  http: AxiosInstance;
  /** Interceptor-free instance used only for token refresh. Exposed for tests. */
  refreshHttp: AxiosInstance;
  /** Subscribe to "the session ended and could not be recovered". Returns unsubscribe. */
  onSessionExpired: (listener: () => void) => () => void;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/** Refreshing failed for a reason that does not mean the session is dead (offline, 5xx). */
class TransientRefreshError extends Error {}

/** Unique key for a write the server must apply at most once (send as Idempotency-Key). */
export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const { session, refreshPath = '/auth/refresh', timeoutMs = 20_000 } = options;
  const baseURL = options.baseURL.replace(/\/+$/, '');
  const common: AxiosRequestConfig = { baseURL, timeout: timeoutMs };

  const http = axios.create(common);
  const refreshHttp = axios.create(common);

  const listeners = new Set<() => void>();
  const endSession = () => {
    session.clearSession();
    listeners.forEach((fn) => fn());
  };

  http.interceptors.request.use((config) => {
    const token = session.getAccessToken();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    const businessId = session.getBusinessId();
    if (businessId) config.headers.set('X-Business-Id', businessId);
    return config;
  });

  async function doRefresh(): Promise<void> {
    const refreshToken = session.getRefreshToken();
    if (!refreshToken) throw new ApiError(401, 'UNAUTHORIZED', 'No refresh token');
    try {
      const { data } = await refreshHttp.post<Partial<Tokens>>(refreshPath, { refreshToken });
      if (!data?.accessToken || !data.refreshToken) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Malformed refresh response');
      }
      session.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // Offline or the server is down: the refresh token may still be valid. Keep the
      // session so the till recovers when the connection returns.
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === undefined || status >= 500) throw new TransientRefreshError();
      throw new ApiError(status, 'UNAUTHORIZED', 'Session expired');
    }
  }

  // One refresh at a time: concurrent 401s all wait on the same request, so a
  // rotating refresh token is never spent twice.
  let inFlight: Promise<void> | null = null;
  function refreshOnce(): Promise<void> {
    inFlight ??= doRefresh().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  http.interceptors.response.use(
    (res) => res,
    async (error: unknown) => {
      const isAxios = axios.isAxiosError(error);
      const config = isAxios ? (error.config as RetriableConfig | undefined) : undefined;
      const is401 = isAxios && error.response?.status === 401;
      const isAuthCall =
        config?.url === refreshPath || (config?.url?.startsWith('/auth/login') ?? false);

      if (!is401 || !config || config._retried || config.skipAuthRefresh || isAuthCall) {
        throw toApiError(error);
      }
      config._retried = true;

      // Another request may have refreshed while this one was in flight: the store then holds a
      // token different from the one this request was sent with. A request sent with NO token
      // (the first one after a page reload, when only the refresh token survives) must still refresh.
      const sentWith = config.headers.get('Authorization');
      const current = session.getAccessToken();
      const alreadyRefreshed = current !== null && sentWith !== `Bearer ${current}`;
      try {
        if (!alreadyRefreshed) await refreshOnce();
      } catch (refreshErr) {
        if (refreshErr instanceof TransientRefreshError) throw toApiError(error);
        endSession();
        throw toApiError(error);
      }
      return http.request(config); // the request interceptor attaches the new token
    },
  );

  return {
    http,
    refreshHttp,
    onSessionExpired(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
