'use server';

import type { Person, PersonAward } from '@tvseri.es/schemas';

import { isUnavailable } from '@/lib/cache/unavailable';

import type { ShowRowView } from '../_lib/shows';
import { loadFamilyAndAwards, loadShowsView } from './loaders';

const isPersonId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const GENDERS: ReadonlyArray<Person['gender']> = [
  'female',
  'male',
  'non-binary',
  undefined,
];

/**
 * The folded "As himself" credits, fetched when the viewer opens them, so
 * they never ride along in the page's payload. Reads the same cached loader
 * as the page; nothing about the viewer.
 */
export async function loadSelfCredits(
  personId: unknown,
  gender: unknown,
): Promise<ReadonlyArray<ShowRowView>> {
  if (!isPersonId(personId) || !GENDERS.includes(gender as Person['gender'])) {
    return [];
  }
  const view = await loadShowsView(personId, gender as Person['gender']);
  return view && !isUnavailable(view) ? view.self : [];
}

/**
 * Every award and nomination for the "All N nominations" sheet, fetched when
 * it opens, so the list never rides along in the page's payload.
 */
export async function loadAwardItems(
  personId: unknown,
): Promise<ReadonlyArray<PersonAward>> {
  if (!isPersonId(personId)) {
    return [];
  }
  const data = await loadFamilyAndAwards(personId);
  return isUnavailable(data) ? [] : (data.awards?.items ?? []);
}
