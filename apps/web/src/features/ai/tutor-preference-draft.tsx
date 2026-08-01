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
  | { code?: WebTutorTurnError['code']; kind: 'error'; message: string };

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
      setState({ code, kind: 'error', message: errorCopy[code] });
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [message, preferences, state.kind]);

  const isSubmitting = state.kind === 'submitting';
  const isDisabled = isSubmitting || message.trim().length === 0;

  return (
    <section className="tutor-assistant">
      <div className="tutor-assistant__intro">
        <p className="tutor-assistant__eyebrow">Trợ lý AI</p>
        <h2>Hỏi bằng tiếng Việt</h2>
        <p>
          Chọn cấu hình trước khi hỏi. Câu trả lời hiển thị ranh giới nguồn và không tự nhận là giáo
          trình chính thức.
        </p>
      </div>
      <TutorPreferenceControls
        disabled={isSubmitting}
        onChange={(next) => {
          setPreferences(next);
          if (state.kind !== 'idle') setState({ kind: 'idle' });
        }}
        preferences={preferences}
      />
      <form
        className="tutor-assistant__form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="tutor-choice" htmlFor="tutor-message">
          Câu hỏi của bạn
          <textarea
            aria-describedby="tutor-message-help"
            className="tutor-assistant__textarea"
            disabled={isSubmitting}
            id="tutor-message"
            maxLength={2000}
            onChange={(event) => {
              setMessage(event.target.value);
              if (state.kind !== 'idle') setState({ kind: 'idle' });
            }}
            placeholder="Ví dụ: Vì sao dùng は thay vì が?"
            rows={5}
            value={message}
          />
        </label>
        <p className="tutor-assistant__hint" id="tutor-message-help">
          Tối đa 2.000 ký tự. Không gửi mật khẩu, mã xác thực hoặc thông tin nhận diện.
        </p>
        <button
          aria-busy={isSubmitting}
          className="tutor-button tutor-button--primary"
          disabled={isDisabled}
          type="submit"
        >
          {isSubmitting ? 'Đang suy nghĩ…' : 'Gửi câu hỏi'}
        </button>
        {isSubmitting ? (
          <button
            className="tutor-button tutor-button--secondary"
            onClick={() => {
              activeRequest.current?.abort();
              setState({ kind: 'idle' });
            }}
            type="button"
          >
            Dừng yêu cầu
          </button>
        ) : null}
      </form>
      {state.kind === 'error' ? (
        <div aria-live="assertive" className="tutor-error">
          <p className="tutor-error__message">{state.message}</p>
          {state.code === 'UNAUTHORIZED' ? (
            <a className="tutor-error__link" href="/sign-in?returnTo=%2Fassistant">
              Đăng nhập lại
            </a>
          ) : null}
          <button
            className="tutor-button tutor-button--secondary"
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
