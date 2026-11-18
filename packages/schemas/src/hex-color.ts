import * as v from 'valibot';

/**
 * A six-digit hex colour (`#1c2223`, any case): the only shape a colour from
 * outside (TMDB artwork, an admin, a stored service) may take, since it ends
 * up in inline styles and server-rendered `<style>`.
 */
export const HexColorSchema = v.pipe(v.string(), v.regex(/^#[0-9a-f]{6}$/i));

export const isHexColor = (value: unknown): value is string =>
  v.is(HexColorSchema, value);
