import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { createApiClient, isApiError, type Tokens } from '@/lib/api-client';

function respond(config: Parameters<AxiosAdapter>[0], status: number, data: unknown = {}) {
  const res = { status, statusText: '', data, headers: {}, config } as AxiosResponse;
  return status >= 400
    ? Promise.reject(new AxiosError('x', String(status), config, null, res))
    : Promise.resolve(res);
}

function setup() {
  const state = { access: 'old' as string | null, refresh: 'r1', business: 'biz', cleared: 0 };
  const client = createApiClient({
    baseURL: 'http://api.test/api/',
    session: {
      getAccessToken: () => state.access,
      getRefreshToken: () => state.refresh,
      setTokens: (t: Tokens) => {
        state.access = t.accessToken;
        state.refresh = t.refreshToken;
      },
      getBusinessId: () => state.business,
      clearSession: () => void state.cleared++,
    },
  });
  return { state, client };
}

describe('api client', () => {
  it('refreshes once for concurrent 401s, then retries each request with the new token', async () => {
    const { state, client } = setup();
    let refreshCalls = 0;
    client.refreshHttp.defaults.adapter = (config) => {
      refreshCalls++;
      return respond(config, 200, { accessToken: 'new', refreshToken: 'r2' });
    };
    client.http.defaults.adapter = (config) =>
      config.headers.get('Authorization') === 'Bearer new'
        ? respond(config, 200, { ok: true })
        : respond(config, 401);

    const results = await Promise.all([client.http.get('/a'), client.http.get('/b'), client.http.get('/c')]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(refreshCalls).toBe(1);
    expect(state).toMatchObject({ access: 'new', refresh: 'r2', cleared: 0 });
  });

  it('recovers silently after a page reload, when only the refresh token survived', async () => {
    const { state, client } = setup();
    state.access = null; // a reload: the access token lived in memory only
    let refreshCalls = 0;
    client.refreshHttp.defaults.adapter = (config) => {
      refreshCalls++;
      return respond(config, 200, { accessToken: 'fresh', refreshToken: 'r2' });
    };
    client.http.defaults.adapter = (config) =>
      config.headers.get('Authorization') === 'Bearer fresh' ? respond(config, 200, { ok: true }) : respond(config, 401);

    // The app fires several requests at once on load (profile, business, products...).
    const results = await Promise.all([client.http.get('/auth/me'), client.http.get('/businesses/current'), client.http.get('/products')]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(refreshCalls).toBe(1);
    expect(state).toMatchObject({ access: 'fresh', refresh: 'r2', cleared: 0 });
  });

  it('keeps the session when the refresh fails because the network is down', async () => {
    const { state, client } = setup();
    client.refreshHttp.defaults.adapter = (config) =>
      Promise.reject(new AxiosError('offline', 'ERR_NETWORK', config));
    client.http.defaults.adapter = (config) => respond(config, 401);

    await expect(client.http.get('/a')).rejects.toMatchObject({ status: 401 });
    expect(state.cleared).toBe(0);
    expect(state.refresh).toBe('r1');
  });

  it('does not treat a wrong password as an expired session', async () => {
    const { state, client } = setup();
    let refreshCalls = 0;
    client.refreshHttp.defaults.adapter = (config) => {
      refreshCalls++;
      return respond(config, 200);
    };
    client.http.defaults.adapter = (config) =>
      respond(config, 401, { error: { code: 'UNAUTHORIZED', message: 'Wrong email or password' } });

    await expect(client.http.post('/auth/login', {})).rejects.toMatchObject({
      status: 401,
      message: 'Wrong email or password',
    });
    expect(refreshCalls).toBe(0);
    expect(state.cleared).toBe(0);
  });

  it('normalises server errors and network failures into ApiError', async () => {
    const { client } = setup();
    client.http.defaults.adapter = (config) =>
      respond(config, 422, {
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: [1] },
      });
    const err = await client.http.get('/x').catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    expect(err).toMatchObject({ status: 422, code: 'VALIDATION_ERROR', details: [1] });

    client.http.defaults.adapter = (config) =>
      Promise.reject(new AxiosError('down', 'ERR_NETWORK', config));
    const net = await client.http.get('/x').catch((e: unknown) => e);
    expect(net).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
