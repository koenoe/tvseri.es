/**
 * Formatting shared by the settings sections. Pure and isomorphic: numbers
 * and dates read the same on the server and in the browser (fixed locale,
 * UTC where no time zone is known).
 */

import { formatMonthYear as monthYear } from '@/lib/format/date';

/** An ISO date to "Mar 2024" (the hero's "Member since"); null when unreadable. */
export function formatMonthYear(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : monthYear(date);
}

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

/** "GB" → "United Kingdom"; the code itself when the runtime doesn't know it. */
export function countryName(code: string): string {
  try {
    return REGION_NAMES.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
