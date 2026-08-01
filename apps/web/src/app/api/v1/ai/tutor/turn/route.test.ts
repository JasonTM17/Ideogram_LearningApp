import { describe, expect, it, vi } from 'vitest';

import {
  DeepSeekTutorGatewayError,
  type DeepSeekTutorConfiguration,
  type DeepSeekTutorGateway,
} from '@ideogram/ai';
import type { AuthenticatedSupabaseRequest } from '@/lib/supabase/request-auth';
import { ApiHttpError } from '@/server/http/api-response';
import type { TutorTurnRouteDependencies } from './route';
import { createPostTutorTurnRoute } from './route';

const trustedOrigin = 'https://learn.example.test';
const userId = '123e4567-e89b-42d3-a456-426614174000';
const request = new Request(`${trustedOrigin}/api/v1/ai/tutor/turn`, {
  headers: {
    'content-type': 'application/json',
    origin: trustedOrigin,
    'sec-fetch-site': 'same-origin',
  },
  method: 'POST',
});

const tutorRequest = {
  conversationId: '123e4567-e89b-42d3-a456-426614174001',
  learnerPreference: {
    explanationDepth: 'standard' as const,
    preferredLanguageCode: 'ja' as const,
    preferredObjectiveKey: 'communication' as const,
    tone: 'encouraging' as const,
  },
  message: 'Vì sao dùng は?',
  targetLevelCode: 'N5',
  turnId: '123e4567-e89b-42d3-a456-426614174002',
};

const tutorResponse = {
  assessmentVietnamese: 'Đúng hướng.',
  example: 'これは本です。',
  explanationVietnamese: 'は đánh dấu chủ đề.',
  frequentVietnameseMistake: 'Không đồng nhất は với chủ ngữ.',
  nextExerciseVietnamese: 'Đặt một câu với は.',
  sourceBoundaryVietnamese: 'Chưa có nguồn bài học.',
};
const usage = { completionTokens: 20, promptTokens: 30, totalTokens: 50 } as const;
const receipt = {
  conversationId: tutorRequest.conversationId,
  idempotentReplay: false,
  response: tutorResponse,
  state: 'completed' as const,
  turnId: tutorRequest.turnId,
  usage,
};
const configuration: DeepSeekTutorConfiguration = {
  apiKey: 'server-only-test-key',
  baseUrl: 'https://api.deepseek.com',
  consentPolicyKey: 'ai-tutor-provider-processing-v1',
  enabled: true,
  inputPriceMicrousdPerMillionTokens: 140_000,
  model: 'deepseek-v4-flash',
  outputPriceMicrousdPerMillionTokens: 280_000,
  reasoningEffort: 'high',
  thinkingMode: 'disabled',
};

const authenticatedRequest = (): AuthenticatedSupabaseRequest => ({
  client: {} as AuthenticatedSupabaseRequest['client'],
  responseHeaders: new Headers({ 'x-supabase-refresh': 'applied' }),
  source: 'bearer',
  user: { id: userId } as AuthenticatedSupabaseRequest['user'],
});

const pendingReservation = {
  conversationId: tutorRequest.conversationId,
  idempotentReplay: false,
  leaseToken: '123e4567-e89b-42d3-a456-426614174003',
  state: 'pending' as const,
  turnId: tutorRequest.turnId,
};

const createGateway = (result: Awaited<ReturnType<DeepSeekTutorGateway['respond']>>) =>
  ({ respond: vi.fn<DeepSeekTutorGateway['respond']>(async () => result) }) as DeepSeekTutorGateway;

const baseDependencies = (
  overrides: Partial<TutorTurnRouteDependencies> = {},
): TutorTurnRouteDependencies => ({
  authenticate: async () => authenticatedRequest(),
  beginTurn: async () => pendingReservation,
  calculateCost: () => 123,
  completeTurn: async () => receipt,
  createGateway: () => createGateway({ response: tutorResponse, usage }),
  failTurn: async () => undefined,
  readBody: async () => tutorRequest,
  readReplay: async () => undefined,
  readConfiguration: () => configuration,
  readTrustedOrigin: () => trustedOrigin,
  ...overrides,
});

describe('POST /api/v1/ai/tutor/turn', () => {
  it('reserves, calls the provider, finalizes usage, and returns a private receipt', async () => {
    const gateway = createGateway({ response: tutorResponse, usage });
    const beginTurn = vi.fn(async () => pendingReservation);
    const completeTurn = vi.fn(async () => receipt);
    const calculateCost = vi.fn(() => 123);
    const route = createPostTutorTurnRoute(
      baseDependencies({
        beginTurn,
        calculateCost,
        completeTurn,
        createGateway: () => gateway,
      }),
    );

    const response = await route(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(receipt);
    expect(beginTurn).toHaveBeenCalledWith({
      consentPolicyKey: configuration.consentPolicyKey,
      request: tutorRequest,
      userId,
    });
    expect(gateway.respond).toHaveBeenCalledWith(tutorRequest, {
      signal: request.signal,
    });
    expect(calculateCost).toHaveBeenCalledWith({ configuration, usage });
    expect(completeTurn).toHaveBeenCalledWith({
      configurationVersion: 'deepseek-v4-flash:high:disabled',
      conversationId: tutorRequest.conversationId,
      estimatedCostMicrousd: 123,
      leaseToken: pendingReservation.leaseToken,
      providerModel: 'deepseek-v4-flash',
      request: tutorRequest,
      response: tutorResponse,
      usage,
      userId,
    });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-supabase-refresh')).toBe('applied');
  });

  it('returns a completed replay without calling DeepSeek again', async () => {
    const gateway = createGateway({ response: tutorResponse, usage });
    const beginTurn = vi.fn(async () => pendingReservation);
    const readReplay = vi.fn(async () => ({ ...receipt, idempotentReplay: true }));
    const completeTurn = vi.fn(async () => receipt);
    const route = createPostTutorTurnRoute(
      baseDependencies({ beginTurn, completeTurn, createGateway: () => gateway, readReplay }),
    );

    const response = await route(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ...receipt, idempotentReplay: true });
    expect(gateway.respond).not.toHaveBeenCalled();
    expect(readReplay).toHaveBeenCalledWith({ request: tutorRequest, userId });
    expect(beginTurn).not.toHaveBeenCalled();
    expect(completeTurn).not.toHaveBeenCalled();
  });

  it('returns an exact replay even when new provider configuration is disabled', async () => {
    const readReplay = vi.fn(async () => ({ ...receipt, idempotentReplay: true }));
    const readConfiguration = vi.fn(() => {
      throw new ApiHttpError({
        code: 'UNAVAILABLE',
        message: 'Gia sư AI chưa được bật cho môi trường này.',
        status: 503,
      });
    });
    const route = createPostTutorTurnRoute(baseDependencies({ readConfiguration, readReplay }));

    const response = await route(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ...receipt, idempotentReplay: true });
    expect(readReplay).toHaveBeenCalledOnce();
    expect(readConfiguration).not.toHaveBeenCalled();
  });

  it('rejects malformed input before a reservation or provider call', async () => {
    const beginTurn = vi.fn(async () => pendingReservation);
    const gateway = createGateway({ response: tutorResponse, usage });
    const route = createPostTutorTurnRoute(
      baseDependencies({ beginTurn, createGateway: () => gateway, readBody: async () => ({}) }),
    );

    const response = await route(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(beginTurn).not.toHaveBeenCalled();
    expect(gateway.respond).not.toHaveBeenCalled();
  });

  it('fails closed when the AI kill switch is off', async () => {
    const beginTurn = vi.fn(async () => pendingReservation);
    const route = createPostTutorTurnRoute(
      baseDependencies({
        beginTurn,
        readConfiguration: () => {
          throw new ApiHttpError({
            code: 'UNAVAILABLE',
            message: 'Gia sư AI chưa được bật cho môi trường này.',
            status: 503,
          });
        },
      }),
    );

    const response = await route(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: 'UNAVAILABLE' });
    expect(beginTurn).not.toHaveBeenCalled();
  });

  it('marks a provider timeout/failure without leaking provider details', async () => {
    const failTurn = vi.fn(async () => undefined);
    const route = createPostTutorTurnRoute(
      baseDependencies({
        createGateway: () =>
          (() => {
            const gateway = createGateway({ response: tutorResponse, usage });
            vi.mocked(gateway.respond).mockRejectedValue(new DeepSeekTutorGatewayError());
            return gateway;
          })(),
        failTurn,
      }),
    );

    const response = await route(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(503);
    expect(body.message).toBe('Gia sư AI tạm thời chưa trả lời được. Vui lòng thử lại sau.');
    expect(body.message).not.toContain('DeepSeek');
    expect(failTurn).toHaveBeenCalledWith({
      conversationId: pendingReservation.conversationId,
      errorCode: 'provider_unavailable',
      leaseToken: pendingReservation.leaseToken,
      request: tutorRequest,
      userId,
    });
  });

  it('maps authentication failures to a safe 401 without touching AI dependencies', async () => {
    const beginTurn = vi.fn(async () => pendingReservation);
    const gateway = createGateway({ response: tutorResponse, usage });
    const route = createPostTutorTurnRoute(
      baseDependencies({
        authenticate: async () => {
          throw new ApiHttpError({
            code: 'UNAUTHORIZED',
            message: 'Bạn cần đăng nhập để tiếp tục.',
            status: 401,
          });
        },
        beginTurn,
        createGateway: () => gateway,
      }),
    );

    const response = await route(request);

    expect(response.status).toBe(401);
    expect(beginTurn).not.toHaveBeenCalled();
    expect(gateway.respond).not.toHaveBeenCalled();
  });
});
