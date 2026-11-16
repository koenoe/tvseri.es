import type { WatchProvider } from '@tvseri.es/schemas';
import Link from 'next/link';
import Badge from '@/components/ui/button/Badge';
import { plusGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import ServiceIcon, {
  type ServiceIconLayout,
} from '@/components/ui/service/ServiceIcon';

/**
 * Logos one row holds beside the label in the 300px column (22px, 4 apart):
 * past this, the row shows one fewer and "+N" with the rest's names on hover
 */
const MAX_LOGOS = 8;

/** Each place keeps its own look on purpose; don't unify them. */
const LOGO: ServiceIconLayout = {
  className: 'size-[22px] shrink-0 rounded-[5px]',
  size: 22,
};

/** What a logo needs of a service */
type Service = Pick<WatchProvider, 'id' | 'logo' | 'name'>;

/**
 * "Watches on" and the services' 22px logos. Without services the owner
 * sees "Not set" and a dashed + to add them; a visitor sees nothing.
 */
export default function WatchesOn({
  isOwner,
  providers,
}: Readonly<{ isOwner: boolean; providers: ReadonlyArray<Service> }>) {
  if (providers.length === 0 && !isOwner) {
    return null;
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 whitespace-nowrap text-[13px] text-white/60">
        Watches on
      </span>
      {providers.length === 0 ? (
        <span className="flex items-center gap-2 text-[12px] text-white/60">
          Not set
          <Link
            aria-label="Add services"
            className="flex size-[22px] items-center justify-center rounded-[5px] border-[1.5px] border-dashed border-white/30 bg-ground text-white/60 transition-colors hover:border-white/60 hover:text-white"
            href="/settings/streaming-services"
          >
            <Icon className="size-3" glyph={plusGlyph} size={13} />
          </Link>
        </span>
      ) : (
        <Logos providers={providers} />
      )}
    </div>
  );
}

function Logos({ providers }: Readonly<{ providers: ReadonlyArray<Service> }>) {
  const capped = providers.length > MAX_LOGOS;
  const shown = capped ? providers.slice(0, MAX_LOGOS - 1) : providers;
  const rest = providers.slice(shown.length);
  const restNames = rest.map((provider) => provider.name).join(', ');
  return (
    <span className="flex min-w-0 items-center gap-1">
      {shown.map((provider) => (
        <ServiceIcon
          alt={provider.name}
          key={provider.id}
          layout={LOGO}
          logo={provider.logo}
          title={provider.name}
        />
      ))}
      {capped ? (
        <Badge
          aria-label={`and ${restNames}`}
          className="shrink-0"
          title={restNames}
          variant="count"
        >
          +{rest.length}
        </Badge>
      ) : null}
    </span>
  );
}
