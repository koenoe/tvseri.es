import NetworkWordmark from '@/components/ui/network/NetworkWordmark';
import cn from '@/lib/cn';

/** Desktop: up to 360 wide; phone: 48 tall at its own width */
const SIZES = '(min-width: 768px) 360px, 240px';

type Props = Readonly<{
  /** keep the logo's own colours (Netflix red); otherwise it is made white */
  keep: boolean;
  logo: string;
  /** false when the logo can't be drawn white: on a light chip of the same height */
  silhouette: boolean;
}>;

/**
 * The network's TMDB logo as the page title: 72 tall
 * on desktop (64 when it keeps its colours), up to 360 wide, bottom left;
 * 48 on a phone at its own width. Above the fold, so it loads eagerly.
 */
export default function NetworkLogo({ keep, logo, silhouette }: Props) {
  // Phone: 48 tall, its own width (fill); desktop: contained in 360
  const className = cn(
    'h-12 w-auto object-fill md:max-w-[360px] md:object-contain',
    keep ? 'md:h-16' : 'md:h-18',
  );
  const image = (
    // Intrinsic size: the 360 × 72 box at 2× (same ratio, so the same space
    // before it loads); `sizes` keeps the files a 1× and 2× screen load.
    <NetworkWordmark
      alt=""
      className={className}
      height={144}
      keep={keep}
      loading="eager"
      silhouette={silhouette}
      sizes={SIZES}
      src={logo}
      width={720}
    />
  );
  // A logo that keeps its colours is 64 tall: its box is still 72, so the hero
  // is the height of its placeholder whichever logo the network has
  return keep ? <span className="flex items-end md:h-18">{image}</span> : image;
}
