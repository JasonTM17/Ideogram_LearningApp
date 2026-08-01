'use client';

import { useState } from 'react';

const options = ['Tiếng Nhật', 'Tiếng Trung', 'Tiếng Hàn'] as const;

export function TutorPreferenceDraft() {
  const [language, setLanguage] = useState<(typeof options)[number]>(options[0]);

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-orange-700">BẢN NHÁP CẤU HÌNH</p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">Ngôn ngữ muốn học</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            className={
              language === option
                ? 'rounded-full bg-orange-700 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-800'
            }
            key={option}
            onClick={() => setLanguage(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-stone-600">Bản nháp chưa được lưu hoặc gửi đến Trợ lý.</p>
    </section>
  );
}
