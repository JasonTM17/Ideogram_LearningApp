import { describe, expect, it } from 'vitest';

import { isExactAllowedRedirectUri, parseAuthorizationCodeCallback } from './auth-callback';
import {
  createEmailOtpAcceptedResponse,
  createSignOutSuccessResponse,
  defaultWebAuthReturnPath,
  genericEmailOtpAcceptedMessage,
  normalizeAuthEmailAddress,
  normalizeWebAuthReturnPath,
  parseEmailOtpCallbackQuery,
} from './auth-web-flow';

describe('authorization-code callback contract', () => {
  it('accepts an authorization code with a non-empty state and exact redirect URI', () => {
    expect(
      parseAuthorizationCodeCallback({
        code: 'one-time-code',
        redirectUri: 'https://app.ideogram.example/auth/callback',
        state: 'opaque-state',
      }),
    ).toEqual({
      callback: {
        code: 'one-time-code',
        redirectUri: 'https://app.ideogram.example/auth/callback',
        state: 'opaque-state',
      },
      status: 'ok',
    });
  });

  it('fails closed when callback state is missing', () => {
    expect(
      parseAuthorizationCodeCallback({
        code: 'one-time-code',
        redirectUri: 'https://app.ideogram.example/auth/callback',
      }),
    ).toEqual({ reason: 'missing_state', status: 'error' });
  });

  it('rejects bearer tokens in the callback payload', () => {
    expect(
      parseAuthorizationCodeCallback({
        access_token: 'never-accept-this',
        code: 'one-time-code',
        redirectUri: 'https://app.ideogram.example/auth/callback',
        state: 'opaque-state',
      }),
    ).toEqual({ reason: 'bearer_token_in_callback', status: 'error' });
  });

  it('uses exact callback matching rather than a host or prefix match', () => {
    const allowedRedirectUris = ['https://app.ideogram.example/auth/callback'];

    expect(
      isExactAllowedRedirectUri(
        'https://app.ideogram.example/auth/callback?next=https://attacker.example',
        allowedRedirectUris,
      ),
    ).toBe(false);
  });
});

describe('web auth flow contract', () => {
  it('normalizes email addresses and safe return paths', () => {
    expect(normalizeAuthEmailAddress(' Minh@example.test ')).toBe('minh@example.test');
    expect(normalizeWebAuthReturnPath('/learn?deck=n5#today')).toBe('/learn?deck=n5#today');
    expect(normalizeWebAuthReturnPath(undefined)).toBe(defaultWebAuthReturnPath);
  });

  it.each(['https://attacker.example', '//attacker.example', '/learn\\evil', '/learn here'])(
    'rejects unsafe web return paths: %s',
    (value) => {
      expect(() => normalizeWebAuthReturnPath(value)).toThrow(TypeError);
    },
  );

  it('rejects values too large for an email field, callback URL, or browser cookie', () => {
    expect(() => normalizeAuthEmailAddress(`${'a'.repeat(310)}@example.test`)).toThrow(TypeError);
    expect(() => normalizeWebAuthReturnPath(`/${'a'.repeat(512)}`)).toThrow(TypeError);
    expect(() => normalizeWebAuthReturnPath(`/${'学'.repeat(228)}`)).toThrow(TypeError);
    expect(
      parseEmailOtpCallbackQuery({
        get: (name) => (name === 'code' ? 'a'.repeat(4_097) : null),
        has: (name) => name === 'code',
      }),
    ).toEqual({
      reason: 'invalid_callback',
      status: 'error',
    });
  });

  it.each([
    '\u0000minh@example.test',
    'minh..nguyen@example.test',
    '.minh@example.test',
    'minh@example_domain.test',
    'minh@-example.test',
    'Kminh@example.test',
  ])('rejects provider-incompatible email input: %s', (email) => {
    expect(() => normalizeAuthEmailAddress(email)).toThrow(TypeError);
  });

  it('applies the callback size limit before trimming attacker-controlled input', () => {
    expect(
      parseEmailOtpCallbackQuery({
        get: (name) => (name === 'code' ? `${' '.repeat(4_096)}x` : null),
        has: (name) => name === 'code',
      }),
    ).toEqual({
      reason: 'invalid_callback',
      status: 'error',
    });
  });

  it('parses only code-based passwordless callbacks', () => {
    expect(
      parseEmailOtpCallbackQuery({
        get: (name) =>
          name === 'code'
            ? 'one-time-code'
            : name === 'sb_flow_id'
              ? '0123456789abcdef0123456789abcdef'
              : null,
        getAll: (name) =>
          name === 'code'
            ? ['one-time-code']
            : name === 'sb_flow_id'
              ? ['0123456789abcdef0123456789abcdef']
              : [],
        has: (name) => name === 'code' || name === 'sb_flow_id',
      }),
    ).toEqual({
      code: 'one-time-code',
      flowId: '0123456789abcdef0123456789abcdef',
      status: 'ok',
    });

    expect(
      parseEmailOtpCallbackQuery({
        get: () => null,
        has: (name) => name === 'access_token',
      }),
    ).toEqual({
      reason: 'bearer_token_in_callback',
      status: 'error',
    });
  });

  it.each(['short', 'flow.with.dot', 'flow with spaces', 'K1234567', 'a'.repeat(65)])(
    'rejects an invalid Supabase PKCE flow identifier: %s',
    (flowId) => {
      expect(
        parseEmailOtpCallbackQuery({
          get: (name) =>
            name === 'code' ? 'one-time-code' : name === 'sb_flow_id' ? flowId : null,
          getAll: (name) =>
            name === 'code' ? ['one-time-code'] : name === 'sb_flow_id' ? [flowId] : [],
          has: (name) => name === 'code' || name === 'sb_flow_id',
        }),
      ).toEqual({
        reason: 'invalid_callback',
        status: 'error',
      });
    },
  );

  it('rejects duplicate callback code or flow parameters', () => {
    expect(
      parseEmailOtpCallbackQuery({
        get: (name) => (name === 'code' ? 'first-code' : null),
        getAll: (name) => (name === 'code' ? ['first-code', 'second-code'] : []),
        has: (name) => name === 'code',
      }),
    ).toEqual({
      reason: 'invalid_callback',
      status: 'error',
    });
  });

  it('exports stable success envelopes for passwordless auth routes', () => {
    expect(createEmailOtpAcceptedResponse()).toEqual({
      accepted: true,
      message: genericEmailOtpAcceptedMessage,
    });
    expect(createSignOutSuccessResponse()).toEqual({ signedOut: true });
  });
});
