import type { CSSProperties } from 'react';

// SMPTE-style colour bars: pure CSS, so the offline
// page draws without a single request.
const TOP: CSSProperties = {
  background:
    'linear-gradient(90deg,#c0c0c0 0 14.28%,#c0c000 0 28.57%,#00c0c0 0 42.85%,#00c000 0 57.14%,#c000c0 0 71.42%,#c00000 0 85.71%,#0000c0 0)',
  flex: '67 0 0',
};
const MIDDLE: CSSProperties = {
  background:
    'linear-gradient(90deg,#0000c0 0 14.28%,#131313 0 28.57%,#c000c0 0 42.85%,#131313 0 57.14%,#00c0c0 0 71.42%,#131313 0 85.71%,#c0c0c0 0)',
  flex: '8 0 0',
};
const BOTTOM: CSSProperties = {
  background:
    'linear-gradient(90deg,#00214c 0 17.85%,#fff 0 35.7%,#32006a 0 53.55%,#131313 0 71.4%,#090909 0 76.2%,#131313 0 80.95%,#1d1d1d 0 85.71%,#131313 0)',
  flex: '25 0 0',
};

/** The off-air test card, dimmed (brightness .42, saturate .8). Decorative. */
export default function TestCard() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col brightness-42 saturate-80"
    >
      <i className="block w-full" style={TOP} />
      <i className="block w-full" style={MIDDLE} />
      <i className="block w-full" style={BOTTOM} />
    </div>
  );
}
