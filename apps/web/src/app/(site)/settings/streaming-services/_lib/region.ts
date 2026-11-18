/**
 * Where the region came from: the visitor's own location (the saved country
 * is the detected one, or none is saved) or a choice they made.
 */
const regionSource = (
  region: string,
  detected: string | null,
): 'chosen' | 'detected' => (region === detected ? 'detected' : 'chosen');

/** The line under the region's name. */
export const regionLine = (region: string, detected: string | null) =>
  `${
    regionSource(region, detected) === 'detected'
      ? 'Detected from your location'
      : 'Chosen by you'
  } · decides which services and release dates you see`;

/** "Detected: Netherlands · You chose: United Kingdom" is shown when they differ. */
export const hasMismatch = (region: string, detected: string | null) =>
  detected !== null && detected !== region;
