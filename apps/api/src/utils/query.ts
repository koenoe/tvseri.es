import { HTTPException } from 'hono/http-exception';

/**
 * Parses a `limit` query param, clamped to 1..max.
 * Missing or non-numeric values fall back to `defaultValue`.
 */
export const parseLimit = (
  value: string | undefined,
  { defaultValue = 20, max }: Readonly<{ defaultValue?: number; max: number }>,
) => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  if (Number.isNaN(parsed)) {
    return defaultValue;
  }
  return Math.min(Math.max(parsed, 1), max);
};

/**
 * Parses an optional date query param. Throws a 400 for invalid dates
 * (instead of a DynamoDB ValidationException → 500).
 */
export const parseDate = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HTTPException(400, { message: 'Invalid date' });
  }
  return date;
};
