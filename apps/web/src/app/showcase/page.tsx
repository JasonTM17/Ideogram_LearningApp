import type { Metadata } from 'next';

import { ShowcaseHeader, ShowcaseHero } from './showcase-hero';
import { ShowcaseFooter, ShowcaseSections } from './showcase-sections';

export const metadata: Metadata = {
  description:
    'Project tour: những phần Ideogram Learning đã triển khai, các visual nguồn và phạm vi beta còn lại.',
  title: 'Project tour',
};

export default function ShowcasePage() {
  return (
    <div className="showcase-site">
      <ShowcaseHeader />
      <main id="main-content" tabIndex={-1}>
        <ShowcaseHero />
        <ShowcaseSections />
      </main>
      <ShowcaseFooter />
    </div>
  );
}
