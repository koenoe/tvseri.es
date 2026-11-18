import Image from 'next/image';
import type { CSSProperties } from 'react';

import { stillScrims } from './scrims';
import type { ErrorBackdrop } from './stills';
import TestCard from './TestCard';

/**
 * The picture behind an error page: a full-bleed still on desktop, the top
 * 520px on a phone, faded into the still's ground by the scrims. The
 * offline page draws the CSS test card instead (no network needed).
 * Decorative.
 */
export default function ErrorScene({
  backdrop,
}: Readonly<{ backdrop: ErrorBackdrop }>) {
  const scrims = stillScrims(backdrop.ground);
  return (
    <>
      <div className="absolute inset-x-0 top-0 -z-20 h-130 transition-opacity duration-500 starting:opacity-0 md:inset-0 md:h-auto">
        {'image' in backdrop ? <Still still={backdrop} /> : <TestCard />}
      </div>
      <span
        aria-hidden
        className="absolute inset-0 -z-10 max-md:hidden"
        style={scrims.desktop}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-130.25 md:hidden"
        style={scrims.phone}
      />
    </>
  );
}

function Still({
  still,
}: Readonly<{ still: Extract<ErrorBackdrop, { image: unknown }> }>) {
  const desktop: CSSProperties = { objectPosition: still.position };
  const phone: CSSProperties = { objectPosition: still.phonePosition };
  return (
    <>
      <Image
        alt=""
        className="object-cover max-md:hidden"
        fill
        loading="eager"
        sizes="100vw"
        src={still.image}
        style={desktop}
        unoptimized
      />
      <Image
        alt=""
        className="object-cover md:hidden"
        fill
        loading="eager"
        sizes="100vw"
        src={still.image}
        style={phone}
        unoptimized
      />
    </>
  );
}
