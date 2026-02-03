import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const countryDisplayNames = new Intl.DisplayNames(['en'], {
  type: 'region',
});

/**
 * Safely get country display name from ISO 3166-1 alpha-2 code.
 * Returns the code itself if invalid or not found.
 */
export function getCountryDisplayName(code: string): string {
  try {
    return countryDisplayNames.of(code) ?? code;
  } catch {
    return code;
  }
}
