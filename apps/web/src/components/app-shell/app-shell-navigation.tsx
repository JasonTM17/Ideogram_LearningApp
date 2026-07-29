import Link from 'next/link';

import { learnerPrimaryDestinations, type LearnerDestinationKey } from './app-shell-destinations';
import { PlannedBadge } from '@/components/ui/planned-badge';

type NavigationVariant = 'sidebar' | 'rail' | 'bottom';

interface AppShellNavigationProps {
  activeKey: LearnerDestinationKey;
  variant: NavigationVariant;
}

export function AppShellNavigation({ activeKey, variant }: AppShellNavigationProps) {
  return (
    <nav aria-label="Điều hướng học tập" className="shell-nav">
      <ul className="shell-nav__list">
        {learnerPrimaryDestinations.map((item) => {
          const isActive = item.key === activeKey;
          const content = (
            <>
              <item.icon
                aria-hidden="true"
                size={variant === 'bottom' ? 20 : 22}
                strokeWidth={1.8}
              />
              <span className="shell-nav-link__text">
                <span className="shell-nav-link__label">{item.label}</span>
                {variant === 'sidebar' ? (
                  <span className="shell-nav-link__description">{item.description}</span>
                ) : null}
                {item.planned ? <PlannedBadge compact={variant !== 'sidebar'} /> : null}
              </span>
            </>
          );

          const sharedProps = {
            'aria-current': isActive ? ('page' as const) : undefined,
            className: 'shell-nav-link',
            'data-active': isActive,
            'data-disabled': !item.href,
            'data-variant': variant,
          };

          return (
            <li key={item.key}>
              {!item.href ? (
                <span {...sharedProps} aria-disabled="true">
                  {content}
                </span>
              ) : (
                <Link {...sharedProps} href={item.href}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
