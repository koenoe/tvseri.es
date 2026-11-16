/**
 * "← → steps through a row · Esc cancels". The app's
 * Inter subset (latin) has no ← and →, so the browser would draw them from
 * another font, wider; these are Inter's arrows at 12px (10.875 wide, the
 * same ink box), so the line matches the board (219.3 wide).
 */

const LEFT = 'M1.72 4.25h7.43M4.69 1.3 1.72 4.25 4.69 7.2';
const RIGHT = 'M9.16 4.25H1.73M6.19 1.3l2.97 2.95-2.97 2.95';

function Arrow({ d }: Readonly<{ d: string }>) {
  return (
    <svg
      aria-hidden="true"
      className="inline-block align-baseline"
      fill="none"
      height="8.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.1"
      viewBox="0 0 10.875 8.5"
      width="10.875"
    >
      <path d={d} />
    </svg>
  );
}

export default function Hint() {
  return (
    <span className="ml-auto text-caption whitespace-nowrap text-white/60">
      <span className="sr-only">Left and right arrow keys</span>
      <Arrow d={LEFT} /> <Arrow d={RIGHT} /> steps through a row · Esc cancels
    </span>
  );
}
