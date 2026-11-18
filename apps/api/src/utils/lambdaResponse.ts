/**
 * Lambda caps a buffered response at 6 MB, measured on the JSON envelope the
 * Function URL gets: a text body (CSV, JSON) is a JSON string in it, so every
 * quote, backslash and newline counts twice. Some room is left for the
 * headers and the envelope itself.
 */
const MAX_ENVELOPE_BODY_BYTES = 5_800_000;

/** Whether a text body fits a Lambda response once JSON-escaped */
export const fitsLambdaResponse = (body: string): boolean =>
  Buffer.byteLength(JSON.stringify(body)) <= MAX_ENVELOPE_BODY_BYTES;
