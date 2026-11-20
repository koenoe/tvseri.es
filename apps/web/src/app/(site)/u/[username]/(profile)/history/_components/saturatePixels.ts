/**
 * CSS `saturate(amount)` on RGBA pixels, in place: the Filter Effects
 * matrix applied to the sRGB values as they are, as Chrome's canvas
 * `filter` does (its output matches to the unit, see the test). WebKit has
 * no canvas `filter`, so the glow does it here and looks the same in every
 * browser. Alpha is left alone; the clamped array rounds and clamps.
 */
export default function saturatePixels(
  data: Uint8ClampedArray,
  amount: number,
) {
  const rr = 0.213 + 0.787 * amount;
  const rg = 0.715 - 0.715 * amount;
  const rb = 0.072 - 0.072 * amount;
  const gr = 0.213 - 0.213 * amount;
  const gg = 0.715 + 0.285 * amount;
  const gb = rb;
  const br = gr;
  const bg = rg;
  const bb = 0.072 + 0.928 * amount;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index]!;
    const green = data[index + 1]!;
    const blue = data[index + 2]!;
    data[index] = rr * red + rg * green + rb * blue;
    data[index + 1] = gr * red + gg * green + gb * blue;
    data[index + 2] = br * red + bg * green + bb * blue;
  }
}
