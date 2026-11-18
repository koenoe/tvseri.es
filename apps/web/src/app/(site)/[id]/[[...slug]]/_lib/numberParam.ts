/**
 * Parses `?season` / `?episode` (positive or zero integers only). Pure, so
 * the server reads the query with it too (`urlState.ts` is client only).
 */
export function toNumberParam(value: string | null): number | null {
  return value !== null && /^\d{1,4}$/.test(value) ? Number(value) : null;
}
