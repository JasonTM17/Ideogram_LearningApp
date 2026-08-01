'use client';

import { useEffect, useRef } from 'react';

import type { TutorTurnResponse } from '@ideogram/contracts';

interface TutorResponsePanelProps {
  idempotentReplay: boolean;
  response: TutorTurnResponse;
}

const responseSections = [
  ['assessmentVietnamese', 'Nhận xét'],
  ['explanationVietnamese', 'Giải thích'],
  ['example', 'Ví dụ'],
  ['frequentVietnameseMistake', 'Lỗi người Việt hay gặp'],
  ['nextExerciseVietnamese', 'Bài tập tiếp theo'],
  ['sourceBoundaryVietnamese', 'Ranh giới nguồn'],
] as const satisfies readonly [keyof TutorTurnResponse, string][];

export function TutorResponsePanel({ idempotentReplay, response }: TutorResponsePanelProps) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <section
      ref={panelRef}
      aria-live="polite"
      aria-labelledby="tutor-response-title"
      className="tutor-response"
      tabIndex={-1}
    >
      <div className="tutor-response__heading">
        <h2 id="tutor-response-title">Trợ lý trả lời</h2>
        {idempotentReplay ? (
          <p className="tutor-response__replay">Kết quả đã lưu được dùng lại an toàn.</p>
        ) : null}
      </div>
      {responseSections.map(([key, label]) => (
        <div className="tutor-response__section" key={key}>
          <h3>{label}</h3>
          <p>{response[key]}</p>
        </div>
      ))}
    </section>
  );
}
