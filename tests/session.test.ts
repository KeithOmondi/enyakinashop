import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from '@/app/store/session';
import { apiClient } from '@/lib/api';

function adapter(status: number, seen: InternalAxiosRequestConfig[]): AxiosAdapter {
  return (config) => {
    seen.push(config);
    const res = { status, statusText: '', data: {}, headers: {}, config } as AxiosResponse;
    return status >= 400
      ? Promise.reject(new AxiosError('x', String(status), config, null, res))
      : Promise.resolve(res);
  };
}

beforeEach(() => {
  localStorage.clear();
  useSessionStore.setState({ accessToken: 'acc', refreshToken: 'ref', businessId: 'biz-gf' });
});

describe('shop session wiring', () => {
  it('sends the session business as X-Business-Id', async () => {
    const seen: InternalAxiosRequestConfig[] = [];
    apiClient.http.defaults.adapter = adapter(200, seen);
    await apiClient.http.get('/products');
    expect(seen[0]!.headers.get('X-Business-Id')).toBe('biz-gf');
    expect(seen[0]!.headers.get('Authorization')).toBe('Bearer acc');
  });

  it('never writes the access token to storage', () => {
    useSessionStore.getState().setTokens({ accessToken: 'secret-access', refreshToken: 'r2' });
    const stored = localStorage.getItem('shop.session') ?? '';
    expect(stored).toContain('r2');
    expect(stored).not.toContain('secret-access');
  });

  it('clears tokens and business when the session ends', async () => {
    apiClient.refreshHttp.defaults.adapter = adapter(401, []);
    apiClient.http.defaults.adapter = adapter(401, []);
    await expect(apiClient.http.get('/products')).rejects.toMatchObject({ status: 401 });
    expect(useSessionStore.getState()).toMatchObject({
      accessToken: null,
      refreshToken: null,
      businessId: null,
    });
  });
});
