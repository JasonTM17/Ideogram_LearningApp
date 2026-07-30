import { describe, expect, it, vi } from 'vitest';

import {
  authReturnPathCookieName,
  authReturnPathCookiePath,
  consumeAuthReturnPath,
  createAuthReturnPathCookieName,
  maximumPendingAuthReturnPathCookies,
  storeAuthReturnPath,
} from './auth-return-path';

import type { AuthCookieStore } from './auth-cookie-store';

const createCookieStore = (value?: string): AuthCookieStore => ({
  get: vi.fn((name: string) =>
    name === authReturnPathCookieName && value !== undefined ? { name, value } : undefined,
  ),
  getAll: vi.fn(() => []),
  set: vi.fn(),
});

describe('auth return path cookie', () => {
  it('stores a short-lived hardened callback return target', () => {
    const cookieStore = createCookieStore();

    storeAuthReturnPath({
      cookieStore,
      isProduction: true,
      returnTo: '/learn?deck=n5',
    });

    expect(cookieStore.set).toHaveBeenCalledWith(
      authReturnPathCookieName,
      '/learn?deck=n5',
      expect.objectContaining({
        httpOnly: true,
        maxAge: 900,
        path: authReturnPathCookiePath,
        sameSite: 'lax',
        secure: true,
      }),
    );
  });

  it('isolates return targets by PKCE flow when several links are in flight', () => {
    const flowId = '0123456789abcdef0123456789abcdef';
    const cookieStore = createCookieStore();

    storeAuthReturnPath({
      cookieStore,
      flowId,
      isProduction: true,
      returnTo: '/lessons/ja-n5-intro',
    });

    expect(cookieStore.set).toHaveBeenCalledWith(
      createAuthReturnPathCookieName(flowId),
      '/lessons/ja-n5-intro',
      expect.objectContaining({
        httpOnly: true,
        path: authReturnPathCookiePath,
      }),
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      authReturnPathCookieName,
      '',
      expect.objectContaining({ maxAge: 0 }),
    );
    expect(cookieStore.set).not.toHaveBeenCalledWith(
      authReturnPathCookieName,
      '/lessons/ja-n5-intro',
      expect.anything(),
    );
  });

  it('caps pending flow return cookies before storing another flow', () => {
    const existingCookies = Array.from(
      { length: maximumPendingAuthReturnPathCookies },
      (_, index) => ({
        name: createAuthReturnPathCookieName(`flow_slot_${String(index).padStart(2, '0')}`),
        value: `/lessons/${index}`,
      }),
    );
    const cookieStore: AuthCookieStore = {
      get: vi.fn(),
      getAll: vi.fn(() => existingCookies),
      set: vi.fn(),
    };

    storeAuthReturnPath({
      cookieStore,
      flowId: 'flow_slot_new',
      isProduction: true,
      returnTo: '/today',
    });

    expect(cookieStore.set).toHaveBeenCalledWith(
      existingCookies[0]?.name,
      '',
      expect.objectContaining({ maxAge: 0 }),
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      createAuthReturnPathCookieName('flow_slot_new'),
      '/today',
      expect.anything(),
    );
  });

  it('consumes and clears the stored return target', () => {
    const cookieStore = createCookieStore('/today');

    expect(
      consumeAuthReturnPath({
        cookieStore,
        isProduction: false,
      }),
    ).toBe('/today');

    expect(cookieStore.set).toHaveBeenCalledWith(
      authReturnPathCookieName,
      '',
      expect.objectContaining({
        httpOnly: true,
        maxAge: 0,
        path: authReturnPathCookiePath,
        sameSite: 'lax',
        secure: false,
      }),
    );
  });

  it('fails closed to the default path when a tampered cookie is present', () => {
    const cookieStore = createCookieStore('https://attacker.example');

    expect(
      consumeAuthReturnPath({
        cookieStore,
        isProduction: true,
      }),
    ).toBe('/');
  });

  it('consumes only the return target bound to the callback flow', () => {
    const flowId = 'fedcba9876543210fedcba9876543210';
    const flowCookieName = createAuthReturnPathCookieName(flowId);
    const cookieStore: AuthCookieStore = {
      get: vi.fn((name: string) =>
        name === flowCookieName ? { name, value: '/review' } : undefined,
      ),
      getAll: vi.fn(() => []),
      set: vi.fn(),
    };

    expect(
      consumeAuthReturnPath({
        cookieStore,
        flowId,
        isProduction: true,
      }),
    ).toBe('/review');

    expect(cookieStore.set).toHaveBeenCalledWith(
      flowCookieName,
      '',
      expect.objectContaining({ maxAge: 0 }),
    );
    expect(cookieStore.set).not.toHaveBeenCalledWith(
      authReturnPathCookieName,
      '',
      expect.anything(),
    );
  });
});
