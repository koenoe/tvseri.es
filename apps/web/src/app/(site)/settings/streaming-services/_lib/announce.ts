import { plural } from '@tvseri.es/utils';

/**
 * What the shelf's live region says as services are reordered or removed:
 * the name with its old and new place (places are 0-based here, read 1-based).
 */
export const announce = {
  moved: (name: string, from: number, to: number, count: number) =>
    from === to
      ? `${name} back at ${to + 1} of ${count}.`
      : `${name} moved from ${from + 1} to ${to + 1} of ${count}.`,
  pickedUp: (name: string, at: number, count: number) =>
    `${name} picked up, ${at + 1} of ${count}.`,
  removed: (name: string, left: number) =>
    `${name} removed. ${plural(left, 'service')}.`,
  step: (name: string, at: number, count: number) =>
    `${name}, ${at + 1} of ${count}.`,
};
