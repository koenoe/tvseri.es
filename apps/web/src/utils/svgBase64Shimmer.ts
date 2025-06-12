const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="rgba(255, 255, 255, 0)" offset="0%" />
      <stop stop-color="rgba(255, 255, 255, 0.05)" offset="50%" />
      <stop stop-color="rgba(255, 255, 255, 0)" offset="100%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="rgba(255, 255, 255, 0.05)" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite" />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

export default function svgBase64Shimmer(w: number, h: number) {
  return toBase64(shimmer(w, h));
}
