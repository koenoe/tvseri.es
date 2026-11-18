/**
 * An image's width / height from its first bytes, so a box can be sized
 * before the image loads: PNG (the IHDR chunk) and SVG (`viewBox`, else
 * `width` and `height`). Null for anything else or a malformed file.
 */
export function imageRatio(bytes: Uint8Array): number | null {
  // PNG: 8-byte signature, then IHDR's width and height (big-endian)
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    return width > 0 && height > 0 ? width / height : null;
  }
  const text = new TextDecoder().decode(bytes.subarray(0, 4096));
  const svg = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (!svg) {
    return null;
  }
  const viewBox =
    /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(
      svg,
    );
  const width = Number(
    viewBox?.[1] ?? /\swidth\s*=\s*["']([\d.]+)/i.exec(svg)?.[1],
  );
  const height = Number(
    viewBox?.[2] ?? /\sheight\s*=\s*["']([\d.]+)/i.exec(svg)?.[1],
  );
  return width > 0 && height > 0 ? width / height : null;
}
