import Link from 'next/link';

import type { ReactNode } from 'react';

interface ActionLinkProps {
  children: ReactNode;
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function ActionLink({ children, href, variant = 'primary' }: ActionLinkProps) {
  return (
    <Link className="action-link" data-variant={variant} href={href}>
      {children}
    </Link>
  );
}
