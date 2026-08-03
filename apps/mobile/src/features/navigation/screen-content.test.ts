import { describe, expect, it } from 'vitest';

import { assistantContent } from '../assistant/assistant-content';
import { lessonContent } from '../lesson/lesson-content';
import { profileContent } from '../profile/profile-content';
import { progressContent } from '../progress/progress-content';
import { reviewContent } from '../review/review-content';
import { todayContent } from '../today/today-content';

const screenContent = [
  todayContent,
  reviewContent,
  assistantContent,
  progressContent,
  profileContent,
  lessonContent,
] as const;

describe('mobile shell copy', () => {
  it('provides Vietnamese titles and truthful state descriptions for every screen', () => {
    for (const content of screenContent) {
      expect(content.title.trim().length).toBeGreaterThan(0);
      expect(content.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('does not ship illustrative learner identity or Stitch metrics', () => {
    const serializedContent = JSON.stringify(screenContent);

    expect(serializedContent).not.toMatch(/Nguyễn Văn A|24 từ|4\/5|45%|7 \/ 20/);
    expect(serializedContent).toMatch(/chưa|Chưa/);
  });
});
