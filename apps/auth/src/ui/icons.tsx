/** @jsxImportSource hono/jsx */
import { LOGO_PATH, LOGO_VIEWBOX } from '@tvseri.es/constants';
import type { Child } from 'hono/jsx';
import type { JSX } from 'hono/jsx/jsx-runtime';

// The site's icon set: 24px grid, 2px round strokes, sized by the caller's class.

function Line({ children, size }: Readonly<{ children: Child; size: number }>) {
  return (
    <svg
      aria-hidden="true"
      class="ico"
      fill="none"
      height={size}
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}

export const CloseIcon = () => (
  <Line size={16}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Line>
);

export const InboxIcon = () => (
  <Line size={16}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v5a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-5l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </Line>
);

export const WarnIcon = () => (
  <Line size={16}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3zM12 9v4" />
    <circle cx="12" cy="17" fill="currentColor" r="1.1" stroke="none" />
  </Line>
);

export const InfoIcon = () => (
  <Line size={16}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Line>
);

export const ClockIcon = () => (
  <Line size={16}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Line>
);

export const CheckIcon = () => (
  <Line size={16}>
    <path d="M20 6 9 17l-5-5" />
  </Line>
);

export const RefreshIcon = () => (
  <Line size={16}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8M21 3v5h-5" />
  </Line>
);

export const HomeIcon = () => (
  <Line size={16}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </Line>
);

export const LockIcon = () => (
  <Line size={13}>
    <rect height="10" rx="2" width="14" x="5" y="11" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Line>
);

export const ExternalIcon = () => (
  <Line size={13}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Line>
);

export const Spinner = () => (
  <svg
    aria-hidden="true"
    class="a-spin"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-width="2"
    viewBox="0 0 24 24"
  >
    <path d="M21 12a9 9 0 1 1-6.2-8.56" />
  </svg>
);

/** The lock-up (logo_final), 18px on auth */
export const Logo = () => (
  <svg
    aria-label="tvseri.es"
    fill="currentColor"
    height="18"
    role="img"
    viewBox={LOGO_VIEWBOX}
    width="93.0"
  >
    <g transform="scale(1 -1)">
      <path d={LOGO_PATH} />
    </g>
  </svg>
);

/** Provider marks: Google's full-colour G untouched (its branding rules) */
export const PROVIDER_ICONS: Readonly<Record<string, () => JSX.Element>> = {
  apple: () => (
    <svg aria-hidden="true" class="g" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  ),
  discord: () => (
    <svg aria-hidden="true" class="g" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  ),
  github: () => (
    <svg aria-hidden="true" class="g" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
  google: () => (
    <svg aria-hidden="true" class="g" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  ),
};
