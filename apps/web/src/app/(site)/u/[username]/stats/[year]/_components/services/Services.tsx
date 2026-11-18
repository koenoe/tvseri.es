import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import {
  linkGlyph,
  plusGlyph,
  variantWalletGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';
import ServiceIcon, {
  type ServiceIconLayout,
} from '@/components/ui/service/ServiceIcon';
import cn from '@/lib/cn';

import { getProviders, isUnavailable } from '@/lib/stats/loaders';
import StatsUnavailable from '../../../_components/StatsUnavailable';
import type { SectionProps } from '../types';
import Lane, { LaneGhost } from '../ui/Lane';
import {
  buildServices,
  type ServiceStatus,
  type UnusedService,
  type UsedService,
} from './model';

type Chip = Readonly<{
  /** In the profile's services: filled; otherwise an outline */
  filled: boolean;
  glyph: Glyph;
  /** Desktop text */
  label: string;
  /** Phone text */
  short: string;
}>;

const chipFor = (status: ServiceStatus | 'unused', username: string): Chip => {
  switch (status) {
    case 'plex':
      return {
        filled: true,
        glyph: linkGlyph,
        label: 'Synced from Plex',
        short: 'Plex',
      };
    case 'listed':
      return {
        filled: true,
        glyph: variantWalletGlyph,
        label: `In ${username}’s services`,
        short: 'Listed',
      };
    case 'unlisted':
      return {
        filled: false,
        glyph: plusGlyph,
        label: `Not in ${username}’s services`,
        short: 'Not listed',
      };
    default:
      return {
        filled: false,
        glyph: variantWalletGlyph,
        label: 'Listed, not used',
        short: 'Unused',
      };
  }
};

/** Each place keeps its own look on purpose; don't unify them. */
const LOGO: ServiceIconLayout = {
  className: 'block size-[26px] shrink-0 rounded-6',
  size: 26,
};

function ServiceLogo({
  logo,
  name,
}: Readonly<{ logo: string | null; name: string }>) {
  if (!logo) {
    return (
      <span aria-hidden className="block size-[26px] rounded-6 bg-white/8" />
    );
  }
  return (
    <ServiceIcon
      alt={name}
      layout={LOGO}
      loading="lazy"
      logo={logo}
      title={name}
    />
  );
}

const SHOWS_CLASS = cn(
  'w-16 text-right text-caption tabular-nums',
  'text-white/60',
);

const MORE_SUFFIX = /^(.*?)( and [\d,]+ more)$/;

/**
 * "Billions, Barry, The Pitt and 30 more" on one line. The names are built to
 * fit (`seriesLine`); if the real font is wider than the estimate it is the
 * names that get the ellipsis, so "and 30 more" is never the part cut off.
 */
function NamesLine({
  className,
  line,
}: Readonly<{ className: string; line: string }>) {
  const parts = MORE_SUFFIX.exec(line);
  if (!parts) {
    const truncateClass = cn('truncate', className);
    return <span className={truncateClass}>{line}</span>;
  }
  const lineClass = cn('flex min-w-0', className);
  return (
    <span className={lineClass}>
      <span className="truncate">{parts[1]}</span>
      <span className="shrink-0 whitespace-pre">{parts[2]}</span>
    </span>
  );
}

/** The right-hand pill: filled `white/8` or outlined */
function ChipView({ chip, dim }: Readonly<{ chip: Chip; dim: boolean }>) {
  const classes = cn(
    'inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full px-2 font-medium text-caption',
    chip.filled
      ? 'bg-white/8 text-white/80'
      : 'text-white/60 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]',
    dim && 'text-white/60',
  );
  return (
    <span className={classes}>
      <Icon
        className="hidden size-[11px] md:block"
        glyph={chip.glyph}
        size={13}
      />
      <span className="hidden md:inline">{chip.label}</span>
      <span className="md:hidden">{chip.short}</span>
    </span>
  );
}

/**
 * One service: logo, name and what it was used for, the bar (desktop), the
 * count, and where it stands against the profile's services. On a phone: the
 * count under the name and a short pill, no bar. `dim` fades a service that
 * was listed but not used.
 */
function ServiceRow({
  bar,
  chip,
  dim,
  line,
  logo,
  name,
  shows,
  strong,
}: Readonly<{
  bar: number;
  chip: Chip;
  dim: boolean;
  line: string | null;
  logo: string | null;
  name: string;
  /** "33 shows", "No shows" */
  shows: string;
  /** A fuller bar: Plex or a listed service */
  strong: boolean;
}>) {
  const rowClass =
    'group/svr grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3 border-white/6 border-t py-2.5 md:min-h-14 md:grid-cols-[28px_minmax(0,230px)_minmax(0,1fr)_170px] md:gap-3.5 md:rounded-10 md:border-t-0 md:px-2 md:py-0 md:transition-colors md:duration-150 md:hover:bg-white/5';
  const textTone = 'text-white/60';
  const fill = cn(
    'absolute inset-y-0 left-0 rounded-2 transition-colors duration-150 group-hover/svr:bg-white!',
    strong ? 'bg-white/55' : 'bg-white/25',
  );
  const fillStyle = { width: `${bar}%` };
  const phoneLine = dim && line ? line : shows;
  const nameClass = cn(
    'whitespace-nowrap font-semibold text-body-sm',
    dim && 'text-white/60',
  );
  const namesLineClass = cn('text-caption', textTone, 'max-md:hidden');
  const phoneLineClass = cn('truncate text-caption md:hidden', textTone);
  const trackClass = cn(
    'relative h-1 flex-1 rounded-2 bg-white/6',
    dim && 'opacity-55',
  );
  return (
    <div className={rowClass}>
      <div className={dim ? 'opacity-55' : undefined}>
        <ServiceLogo logo={logo} name={name} />
      </div>
      <span className="flex min-w-0 flex-col gap-0.5 md:gap-1">
        <b className={nameClass}>{name}</b>
        {line ? <NamesLine className={namesLineClass} line={line} /> : null}
        <span className={phoneLineClass}>{phoneLine}</span>
      </span>
      <span className="hidden min-w-0 items-center gap-3 md:flex">
        <span className={trackClass}>
          <i className={fill} style={fillStyle} />
        </span>
        <span className={SHOWS_CLASS}>{shows}</span>
      </span>
      <span className="flex justify-end">
        <ChipView chip={chip} dim={dim} />
      </span>
    </div>
  );
}

function UsedRow({
  service,
  username,
}: Readonly<{ service: UsedService; username: string }>) {
  const chip = chipFor(service.status, username);
  const strong = service.status !== 'unlisted';
  return (
    <ServiceRow
      bar={service.bar}
      chip={chip}
      dim={false}
      line={service.line}
      logo={service.logo}
      name={service.name}
      shows={service.shows}
      strong={strong}
    />
  );
}

function UnusedRow({
  service,
  username,
}: Readonly<{ service: UnusedService; username: string }>) {
  const chip = chipFor('unused', username);
  return (
    <ServiceRow
      bar={0}
      chip={chip}
      dim
      line={service.line}
      logo={service.logo}
      name={service.name}
      shows="No series"
      strong={false}
    />
  );
}

/** "Services": where the year's series were watched, against the profile's own list */
export default async function Services({ user, year }: SectionProps) {
  const providers = await getProviders(user.id, year);
  if (isUnavailable(providers)) {
    return (
      <StatsUnavailable placeholder={<ServicesSkeleton />} title={'Services'} />
    );
  }
  const { count, unused, used } = buildServices(
    providers,
    user.watchProviders,
    year,
  );
  if (used.length === 0) {
    return null;
  }
  const note = (
    <span className="ml-auto hidden text-caption text-white/60 md:block">
      By series; listed services that weren’t used are dimmed
    </span>
  );
  return (
    <Lane
      aside={note}
      badge={count}
      className="gap-4 p-4 md:p-[18px]"
      id="services-title"
      title="Services"
    >
      {/* Phone rows are the lane's own children: 16px apart */}
      <div className="flex flex-col max-md:gap-4">
        {used.map((service) => (
          <UsedRow
            key={service.key}
            service={service}
            username={user.username}
          />
        ))}
        {unused.map((service) => (
          <UnusedRow
            key={service.key}
            service={service}
            username={user.username}
          />
        ))}
      </div>
    </Lane>
  );
}

/** The lane with nine rows: 56px each (67px plus 16 apart on a phone) */
/** A typical year's services rows */
const SERVICE_GHOSTS = Array.from({ length: 9 }, (_, n) => n);

export function ServicesSkeleton() {
  return (
    <LaneGhost className="h-[803px] md:h-[580px]" title="Services">
      {SERVICE_GHOSTS.map((n) => (
        <span className="flex shrink-0 items-center gap-3" key={n}>
          <Ghost className="size-8 shrink-0 rounded-6" />
          <span className="flex w-40 flex-col">
            <TextLine className="text-body-sm" width="w-20" />
            <TextLine className="text-caption" width="w-32" />
          </span>
          <Ghost className="h-1 flex-1 rounded-2 max-md:hidden" />
          <TextLine className="text-caption max-md:hidden" width="w-14" />
        </span>
      ))}
    </LaneGhost>
  );
}
