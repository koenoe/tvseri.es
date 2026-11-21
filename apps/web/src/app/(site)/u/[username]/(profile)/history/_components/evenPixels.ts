/** The glow's shared brightness: the mean luma (0–255) every row is brought to */
const TARGET_LUMA = 70;

/** How far a poster's glow may be dimmed or lifted to get there */
const LEAST = 0.35;
const MOST = 1.6;

/**
 * Brings a row glow's brightness to one shared level, in place: a bright
 * poster (a pale title card) no longer lights its row up while a dark one
 * barely shows. Each pixel's RGB is scaled by one factor, so the poster's
 * hue stays; the factor is capped both ways, so near-black art isn't blown
 * up and a white poster isn't crushed to grey. Mean luma: Rec. 709 weights
 * on the sRGB values, good enough for 96 pixels. Alpha is left alone.
 */
export default function evenPixels(data: Uint8ClampedArray) {
  let sum = 0;
  const pixels = data.length / 4;
  for (let index = 0; index < data.length; index += 4) {
    sum +=
      0.2126 * data[index]! +
      0.7152 * data[index + 1]! +
      0.0722 * data[index + 2]!;
  }
  const mean = pixels === 0 ? 0 : sum / pixels;
  if (mean === 0) {
    return;
  }
  const factor = Math.min(MOST, Math.max(LEAST, TARGET_LUMA / mean));
  for (let index = 0; index < data.length; index += 4) {
    data[index] = data[index]! * factor;
    data[index + 1] = data[index + 1]! * factor;
    data[index + 2] = data[index + 2]! * factor;
  }
}
