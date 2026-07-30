import type { ReactNode } from 'react';

interface PageHeadingProps {
  description: ReactNode;
  eyebrow: string;
  title: ReactNode;
}

export function PageHeading({ description, eyebrow, title }: PageHeadingProps) {
  return (
    <header className="page-heading">
      <p className="page-heading__eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="page-heading__description">{description}</p>
    </header>
  );
}
