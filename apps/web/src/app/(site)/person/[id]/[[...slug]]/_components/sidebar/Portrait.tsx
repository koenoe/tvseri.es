import Image from 'next/image';
import { userGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

/** 112 × 150 on phones, 300 × 400 on desktop */
const FRAME =
  'relative block h-[150px] w-[112px] overflow-hidden rounded-12 lg:h-[400px] lg:w-[300px] lg:rounded-16 lg:shadow-[0_24px_40px_-18px_rgba(0,0,0,0.8)]';

/**
 * The person's photo, the page's LCP: eager and high priority. Without one,
 * the boards' quiet placeholder (`.pr-ph`).
 */
export default function Portrait({
  image,
  name,
}: Readonly<{ image: string; name: string }>) {
  if (!image) {
    return (
      <span
        aria-hidden="true"
        // contrast-exempt: the no-photo person icon
        className={`${FRAME} flex items-center justify-center bg-white/7 text-white/50`}
      >
        <Icon glyph={userGlyph} size={24} />
      </span>
    );
  }
  return (
    <span className={FRAME}>
      <Image
        alt={name}
        className="object-cover object-[center_18%]"
        draggable={false}
        fetchPriority="high"
        fill
        loading="eager"
        sizes="(min-width: 1024px) 300px, 112px"
        src={image}
      />
    </span>
  );
}
