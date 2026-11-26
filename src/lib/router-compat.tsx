'use client';
import React, { useMemo } from 'react';
import {
  useNavigate,
  useLocation,
  useParams as useRRParams,
  Link as RRLink,
  type LinkProps as RRLinkProps,
} from 'react-router-dom';

export interface AppRouterInstance {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
}

export function useRouter(): AppRouterInstance {
  const navigate = useNavigate();

  return useMemo(
    () => ({
      push: (href: string) => navigate(href),
      replace: (href: string) => navigate(href, { replace: true }),
      back: () => navigate(-1),
      forward: () => navigate(1),
      refresh: () => window.location.reload(),
      prefetch: (_href: string) => {
        // Client-side router prefetch no-op
      },
    }),
    [navigate]
  );
}

export function usePathname(): string {
  const location = useLocation();
  return location.pathname;
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>(): T {
  const params = useRRParams();
  return params as unknown as T;
}

export interface LinkProps extends Omit<RRLinkProps, 'to' | 'prefetch'> {
  href: string;
  prefetch?: boolean;
  children: React.ReactNode;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch: _prefetch, ...props },
  ref
) {
  return <RRLink ref={ref} to={href} {...props} />;
});

export default Link;
