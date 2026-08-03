'use client';

import { useEffect, useMemo, useState } from 'react';

import { useBrowserOfflineSync } from '@/features/offline-sync/browser-offline-sync-provider';

import type {
  PlacementCatalogResponse,
  PlacementQuestionSet,
  PlacementSessionReceipt,
  PlacementSessionStartReceipt,
} from '@ideogram/contracts';

type FlowState =
  | { kind: 'ready' }
  | { kind: 'running'; session: PlacementSessionStartReceipt; index: number }
  | { kind: 'awaiting-sync'; placementSessionId: string }
  | { kind: 'done'; receipt: PlacementSessionReceipt }
  | { kind: 'error'; message: string };

const postJson = async (path: string, body: unknown) => {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) throw new Error('request_failed');
  return response.json();
};

const getJson = async (path: string) => {
  const response = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('request_failed');
  return response.json();
};

export function PlacementFlow({ catalog }: { catalog: PlacementCatalogResponse }) {
  const offlineSync = useBrowserOfflineSync();
  const [selectedSetId, setSelectedSetId] = useState(
    catalog.questionSets[0]?.placementQuestionSetId ?? '',
  );
  const [state, setState] = useState<FlowState>({ kind: 'ready' });
  const selectedSet = useMemo(
    () => catalog.questionSets.find((set) => set.placementQuestionSetId === selectedSetId) ?? null,
    [catalog.questionSets, selectedSetId],
  );

  useEffect(() => {
    if (
      (state.kind !== 'done' || state.receipt.sessionStatus === 'scored') &&
      state.kind !== 'awaiting-sync'
    )
      return;
    let stopped = false;
    const readResult = async () => {
      try {
        const receipt = (await getJson(
          `/api/v1/learning/placement/sessions/${state.kind === 'done' ? state.receipt.placementSessionId : state.placementSessionId}`,
        )) as PlacementSessionReceipt;
        if (
          !stopped &&
          (receipt.sessionStatus === 'submitted' || receipt.sessionStatus === 'scored')
        ) {
          setState({ kind: 'done', receipt });
        }
      } catch {
        // Keep the submitted receipt visible; a later poll may still succeed.
      }
    };
    void readResult();
    const interval = window.setInterval(() => void readResult(), 5_000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [state]);

  if (catalog.questionSets.length === 0) {
    return (
      <section className="placement-flow placement-flow--empty">
        <p className="placement-flow__eyebrow">Thiết lập lộ trình</p>
        <h1>Chưa có bài placement</h1>
        <p>
          Hiện chưa có bộ câu hỏi được phát hành. Bạn vẫn có thể vào bài học từ danh mục; khi có bộ
          mới, màn hình này sẽ mở lại.
        </p>
      </section>
    );
  }

  const start = async () => {
    if (!selectedSet) return;
    try {
      const session = (await postJson('/api/v1/learning/placement/sessions', {
        idempotencyKey: crypto.randomUUID(),
        placementQuestionSetId: selectedSet.placementQuestionSetId,
      })) as PlacementSessionStartReceipt;
      setState({ index: 0, kind: 'running', session });
    } catch {
      setState({
        kind: 'error',
        message: 'Chưa thể mở bài placement. Bạn có thể thử lại mà không mất tiến độ.',
      });
    }
  };

  const submitAnswer = async (value: string) => {
    if (state.kind !== 'running' || !selectedSet) return;
    const question = selectedSet.questions[state.index];
    if (!question) return;
    const input = {
      answerPayload: { selectedChoice: value },
      attemptNumber: 1,
      clientRecordedAt: new Date().toISOString(),
      deviceId: crypto.randomUUID(),
      deviceSequence: state.index + 1,
      idempotencyKey: crypto.randomUUID(),
      placementQuestionId: question.placementQuestionId,
      responseTimeMs: 0,
    };
    let answerQueued = false;
    try {
      await postJson(
        `/api/v1/learning/placement/sessions/${state.session.placementSessionId}/answers`,
        input,
      );
    } catch {
      const queuedAnswer = await offlineSync.enqueue('placement-answer', input.idempotencyKey, {
        input,
        placementSessionId: state.session.placementSessionId,
      });
      if (queuedAnswer && state.index + 1 < selectedSet.questions.length) {
        setState({ ...state, index: state.index + 1 });
        return;
      }
      if (!queuedAnswer) {
        setState({
          kind: 'error',
          message: 'Câu trả lời chưa được xác nhận. Hãy thử lại khi mạng ổn định.',
        });
        return;
      }
      answerQueued = true;
    }

    if (state.index + 1 < selectedSet.questions.length) {
      setState({ ...state, index: state.index + 1 });
      return;
    }

    try {
      const receipt = (await postJson(
        `/api/v1/learning/placement/sessions/${state.session.placementSessionId}/submit`,
        {},
      )) as PlacementSessionReceipt;
      setState({ kind: 'done', receipt });
    } catch {
      const queuedSubmit = await offlineSync.enqueue('placement-submit', crypto.randomUUID(), {
        placementSessionId: state.session.placementSessionId,
      });
      if (queuedSubmit) {
        setState({ kind: 'awaiting-sync', placementSessionId: state.session.placementSessionId });
        return;
      }
      setState({
        kind: 'error',
        message: answerQueued
          ? 'Câu trả lời cuối đã được lưu, nhưng chưa thể lưu thao tác hoàn tất. Hãy thử lại khi có mạng.'
          : 'Máy chủ chưa xác nhận hoàn tất placement. Hãy thử lại khi mạng ổn định.',
      });
    }
  };

  if (state.kind === 'done')
    return (
      <section className="placement-flow">
        <p className="placement-flow__eyebrow">Hoàn tất</p>
        <h1>Bạn đã có điểm xuất phát</h1>
        <p>
          Hệ thống sẽ dùng kết quả này để đề xuất mức học phù hợp. Kết quả được tính ở máy chủ để
          giữ công bằng.
        </p>
        <p className="placement-flow__result">
          {state.receipt.recommendedLevelCode
            ? `Mức đề xuất: ${state.receipt.recommendedLevelCode}`
            : 'Đang chấm trên máy chủ. Bạn có thể để trang này mở; kết quả sẽ tự hiện khi sẵn sàng.'}
        </p>
      </section>
    );

  if (state.kind === 'awaiting-sync')
    return (
      <section className="placement-flow">
        <p className="placement-flow__eyebrow">Đang chờ đồng bộ</p>
        <h1>Câu trả lời cuối đã được lưu an toàn</h1>
        <p>
          Thiết bị sẽ gửi phần hoàn tất theo đúng thứ tự khi có mạng. Kết quả chỉ hiện sau khi máy
          chủ xác nhận.
        </p>
        <button
          className="placement-flow__primary"
          type="button"
          onClick={() => void offlineSync.syncNow()}
        >
          Đồng bộ ngay
        </button>
      </section>
    );

  if (state.kind === 'running' && selectedSet) {
    const question = selectedSet.questions[state.index];
    const choices = Array.isArray(question?.promptPayload.choices)
      ? question.promptPayload.choices
      : [];
    return (
      <section className="placement-flow">
        <p className="placement-flow__eyebrow">
          Câu {state.index + 1}/{selectedSet.questions.length}
        </p>
        <h1>
          {String(question?.promptPayload.promptVietnamese ?? 'Hãy chọn câu trả lời phù hợp')}
        </h1>
        <div className="placement-flow__choices">
          {choices.map((choice) => (
            <button
              key={String(choice)}
              type="button"
              onClick={() => void submitAnswer(String(choice))}
            >
              {String(choice)}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="placement-flow">
      <p className="placement-flow__eyebrow">Thiết lập lộ trình</p>
      <h1>Bắt đầu nhẹ nhàng, học đúng mức</h1>
      <p>
        Chọn mục tiêu, làm vài câu hỏi ngắn và nhận đề xuất. Không có đáp án hay rubric nội bộ nào
        được gửi xuống trình duyệt.
      </p>
      <label htmlFor="placement-set">Mục tiêu học</label>
      <select
        id="placement-set"
        value={selectedSetId}
        onChange={(event) => setSelectedSetId(event.target.value)}
      >
        {catalog.questionSets.map((set: PlacementQuestionSet) => (
          <option key={set.placementQuestionSetId} value={set.placementQuestionSetId}>
            {set.titleVietnamese} · {set.languageCode.toUpperCase()}
          </option>
        ))}
      </select>
      <button className="placement-flow__primary" type="button" onClick={() => void start()}>
        Bắt đầu placement
      </button>
      {state.kind === 'error' ? (
        <p className="placement-flow__error" role="alert">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
