'use client';

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
  return (
    <section
      aria-label="Câu trả lời của Trợ lý"
      className="grid gap-4 rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold text-stone-950">Trợ lý trả lời</h2>
        {idempotentReplay ? (
          <p className="mt-1 text-sm font-medium text-emerald-700">
            Kết quả đã lưu được dùng lại an toàn.
          </p>
        ) : null}
      </div>
      {responseSections.map(([key, label]) => (
        <div className="grid gap-1" key={key}>
          <h3 className="text-sm font-semibold text-stone-700">{label}</h3>
          <p className="whitespace-pre-wrap text-sm leading-7 text-stone-900">{response[key]}</p>
        </div>
      ))}
    </section>
  );
}
