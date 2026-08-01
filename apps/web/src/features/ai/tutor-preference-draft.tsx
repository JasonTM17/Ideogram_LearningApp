'use client';

import { createTutorTurnApiRequest } from '@ideogram/api-client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { TutorPreferenceControls, defaultWebTutorPreferences } from './tutor-preference-controls';
import { submitWebTutorTurn, WebTutorTurnError } from './tutor-turn-client';
import { TutorResponsePanel } from './tutor-response-panel';

type TutorUiState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | {
      idempotentReplay: boolean;
      kind: 'ready';
      response: Awaited<ReturnType<typeof submitWebTutorTurn>>['response'];
    }
  | { kind: 'error'; message: string };

const errorCopy: Record<WebTutorTurnError['code'], string> = {
  ABORTED: 'Yêu cầu đã được dừng lại.',
  FORBIDDEN: 'Tài khoản chưa có quyền dùng trợ lý hoặc chưa chấp thuận chính sách AI.',
  INVALID_REQUEST: 'Hãy kiểm tra lại câu hỏi và cấu hình học.',
  INVALID_RESPONSE: 'Trợ lý trả về dữ liệu chưa đúng định dạng an toàn.',
  NETWORK_ERROR: 'Không thể kết nối trợ lý. Kiểm tra mạng rồi thử lại.',
  RATE_LIMITED: 'Bạn đã dùng hết lượt tạm thời. Hãy thử lại sau.',
  SERVER_ERROR: 'Trợ lý đang tạm tắt hoặc chưa được bật cho môi trường này.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
};

export function TutorPreferenceDraft() {
  const conversationId = useRef<string | null>(null);
  const [message, setMessage] = useState('');
  const [preferences, setPreferences] = useState(defaultWebTutorPreferences);
  const [state, setState] = useState<TutorUiState>({ kind: 'idle' });
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => activeRequest.current?.abort();
  }, []);

  const submit = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (state.kind === 'submitting') return;
    if (trimmedMessage.length === 0) {
      setState({ kind: 'error', message: 'Viết một câu hỏi trước khi gửi cho Trợ lý.' });
      return;
    }

    const { targetLevelCode, ...learnerPreference } = preferences;
    const currentConversationId =
      conversationId.current ?? (conversationId.current = crypto.randomUUID());
    const turnId = crypto.randomUUID();
    let request: ReturnType<typeof createTutorTurnApiRequest>;
    try {
      request = createTutorTurnApiRequest({
        conversationId: currentConversationId,
        learnerPreference,
        message: trimmedMessage,
        targetLevelCode,
        turnId,
      });
    } catch {
      setState({ kind: 'error', message: 'Hãy kiểm tra câu hỏi, ngôn ngữ và trình độ đã chọn.' });
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setState({ kind: 'submitting' });
    try {
      const receipt = await submitWebTutorTurn(request.body, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setState({
          idempotentReplay: receipt.idempotentReplay,
          kind: 'ready',
          response: receipt.response,
        });
      }
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      const code = error instanceof WebTutorTurnError ? error.code : 'NETWORK_ERROR';
      setState({ kind: 'error', message: errorCopy[code] });
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [message, preferences, state.kind]);

  const isSubmitting = state.kind === 'submitting';
  const isDisabled = isSubmitting || message.trim().length === 0;

  return (
    <section className="grid gap-5 rounded-3xl border border-stone-200 bg-stone-50 p-4 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-700">
          Trợ lý AI
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-950">Hỏi bằng tiếng Việt</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Chọn cấu hình trước khi hỏi. Câu trả lời hiển thị ranh giới nguồn và không tự nhận là giáo
          trình chính thức.
        </p>
      </div>
      <TutorPreferenceControls
        disabled={isSubmitting}
        onChange={setPreferences}
        preferences={preferences}
      />
      <form
        className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="grid gap-2 text-sm font-semibold text-stone-800" htmlFor="tutor-message">
          Câu hỏi của bạn
          <textarea
            aria-describedby="tutor-message-help"
            id="tutor-message"
            maxLength={2000}
            onChange={(event) => {
              setMessage(event.target.value);
              if (state.kind === 'error') setState({ kind: 'idle' });
            }}
            placeholder="Ví dụ: Vì sao dùng は thay vì が?"
            rows={5}
            value={message}
          />
        </label>
        <p className="text-xs leading-5 text-stone-500" id="tutor-message-help">
          Tối đa 2.000 ký tự. Không gửi mật khẩu, mã xác thực hoặc thông tin nhận diện.
        </p>
        <button
          aria-busy={isSubmitting}
          className="min-h-11 rounded-2xl bg-orange-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isDisabled}
          type="submit"
        >
          {isSubmitting ? 'Đang suy nghĩ…' : 'Gửi câu hỏi'}
        </button>
      </form>
      {state.kind === 'error' ? (
        <div
          aria-live="assertive"
          className="grid gap-3 rounded-3xl border border-red-200 bg-red-50 p-5"
        >
          <p className="text-sm leading-6 text-red-800">{state.message}</p>
          <button
            className="min-h-11 w-fit rounded-2xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50"
            disabled={isDisabled}
            onClick={() => void submit()}
            type="button"
          >
            Thử lại
          </button>
        </div>
      ) : null}
      {state.kind === 'ready' ? (
        <TutorResponsePanel idempotentReplay={state.idempotentReplay} response={state.response} />
      ) : null}
    </section>
  );
}
