import {
  isReservedUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_TOO_LONG,
  UsernameSchema,
} from '@tvseri.es/schemas';
import { toSlug } from '@tvseri.es/utils';
import * as v from 'valibot';

export type UsernameAvailability = 'available' | 'taken' | 'unknown';

export type UsernameHint = Readonly<{
  /** The username part of the form is fine to save. */
  canSave: boolean;
  message: string;
  tone: 'bad' | 'neutral' | 'ok';
}>;

const isUsername = (value: string) => v.is(UsernameSchema, value);

/**
 * The live line under the Username field. The slug rule
 * applies only to a username that is being changed: the saved one is never
 * re-validated or flagged, even if it predates the rule. Pure, so the form
 * and its tests share it.
 */
export function usernameHint({
  availability,
  draft,
  saved,
}: Readonly<{
  availability: UsernameAvailability;
  draft: string;
  saved: string;
}>): UsernameHint {
  const url = `tvseri.es/u/${draft}`;

  if (draft === saved) {
    return {
      canSave: true,
      message: `Your profile is at ${url}`,
      tone: 'neutral',
    };
  }

  if (isReservedUsername(draft)) {
    return { canSave: false, message: `${url} is reserved`, tone: 'bad' };
  }

  if (!isUsername(draft)) {
    return { canSave: false, message: ruleMessage(draft), tone: 'bad' };
  }

  if (availability === 'taken') {
    return { canSave: false, message: `${url} is taken`, tone: 'bad' };
  }
  if (availability === 'available') {
    return {
      canSave: true,
      message: `${url} is available · your old link stops working`,
      tone: 'ok',
    };
  }
  return { canSave: true, message: `Checking ${url}…`, tone: 'neutral' };
}

function ruleMessage(draft: string): string {
  if (draft.length < 3) {
    return 'At least 3 characters';
  }
  if (draft.length > USERNAME_MAX_LENGTH) {
    return USERNAME_TOO_LONG;
  }
  const slug = toSlug(draft);
  const rule = 'Only lowercase letters, numbers and dashes';
  return isUsername(slug) && slug !== draft ? `${rule}: “${slug}” works` : rule;
}
