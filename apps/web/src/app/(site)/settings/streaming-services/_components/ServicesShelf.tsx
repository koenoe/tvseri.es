import type { WatchProvider } from '@tvseri.es/schemas';

import ServiceTile from './ServiceTile';

/** The shelf's box and its tile grid: the placeholder takes the same */
export const SHELF_CARD_CLASS =
  'flex flex-col gap-6 rounded-[20px] bg-[linear-gradient(160deg,rgb(0_255_255/0.07),rgb(255_255_255/0.03)_45%)] p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]';
export const SHELF_GRID_CLASS =
  'grid grid-cols-3 gap-2.5 md:grid-cols-6 md:gap-4';

/**
 * "Your services": the selected ones as big tiles with a check, in the order
 * they were picked (the cyan dot means yours).
 */
export default function ServicesShelf({
  onToggle,
  selected,
}: Readonly<{
  onToggle: (provider: WatchProvider) => void;
  selected: ReadonlyArray<WatchProvider>;
}>) {
  return (
    <section aria-labelledby="your-services" className={SHELF_CARD_CLASS}>
      <div className="flex items-center gap-3">
        <span className="size-2 rounded-full bg-cyan" />
        <h3 className="text-body" id="your-services">
          Your services
        </h3>
        <span className="text-meta text-white/60 tabular-nums">
          {selected.length}
        </span>
      </div>
      {selected.length > 0 ? (
        <div className={SHELF_GRID_CLASS}>
          {selected.map((provider) => (
            <ServiceTile
              key={provider.id}
              onToggle={onToggle}
              provider={provider}
              variant="big"
            />
          ))}
        </div>
      ) : (
        <p className="rounded-14 bg-white/3 p-[18px] text-meta text-white/60">
          None yet: tap a service below.
        </p>
      )}
    </section>
  );
}
