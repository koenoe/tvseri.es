import type { PersonLinkType } from '@tvseri.es/schemas';

/**
 * Brand marks for the Socials row, drawn as line icons: Instagram, X
 * and TikTok (14px, stroke 2). The icon set has no brand
 * glyphs; these exist only on the person page.
 */
const PATHS: Readonly<Partial<Record<PersonLinkType, string>>> = {
  instagram:
    'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M17.5 6.5h.01',
  tiktok: 'M9 12a4 4 0 1 0 4 4V3c.6 2.4 2.4 4.2 5 4.5',
  x: 'M4 4h4.5L20 20h-4.5zM20 4l-6.6 7.2M4 20l6.6-7.2',
  youtube:
    'M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49 49 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49 49 0 0 1-16.2 0A2 2 0 0 1 2.5 17M10 15l5-3-5-3z',
};

export const SOCIAL_LABELS: Readonly<Partial<Record<PersonLinkType, string>>> =
  {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    x: 'X',
    youtube: 'YouTube',
  };

export const hasSocialIcon = (type: PersonLinkType) => type in PATHS;

export default function SocialIcon({
  type,
}: Readonly<{ type: PersonLinkType }>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <path d={PATHS[type]} />
    </svg>
  );
}
