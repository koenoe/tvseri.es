import {
  CONNECTION_SERVICES,
  type ConnectionService,
} from '@tvseri.es/schemas';

import AppTile from '@/components/brand/AppTile';

/** Matches the Connected apps cards' tiles and glyph proportions */
const TILE = 'size-10 rounded-[11px] md:size-11 md:rounded-12';

const GLYPH: Readonly<Record<ConnectionService, string>> = {
  bbc: 'size-[23.3px] md:size-[25.7px]',
  netflix: 'size-[23.3px] md:size-[25.7px]',
  prime: 'w-[30px] md:w-[33px]',
};

export default function ServiceLogos() {
  return (
    <div className="mt-1 flex gap-2.5">
      {CONNECTION_SERVICES.map((service) => (
        <AppTile
          app={service}
          className={TILE}
          glyphClassName={GLYPH[service]}
          key={service}
        />
      ))}
    </div>
  );
}
