import { themeBySlug } from '@tvseri.es/constants';
import { notFound } from 'next/navigation';

/**
 * A theme landing's name, from the theme list (no API, so it is in the
 * shell); `notFound()` for a slug that isn't a theme landing.
 */
export function themeForSlug(slug: string): Readonly<{ title: string }> {
  const theme = themeBySlug(slug);
  if (!theme) {
    notFound();
  }
  return { title: theme.name };
}
