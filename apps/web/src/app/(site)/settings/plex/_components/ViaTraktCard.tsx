const ROWS = [
  ['Kodi', 'Scrobbles through the Trakt add-on only'],
  ['Infuse', 'Syncs watched history with Trakt only'],
  ['Trakt', 'Would need an account link and a periodic sync'],
] as const;

/**
 * Kodi, Infuse and others: no webhooks.
 * "Later" is quiet: the title at 60%, the line 16px under it.
 * On a phone the chip wraps onto its own right-aligned line.
 */
export default function ViaTraktCard() {
  return (
    <section className="flex flex-col gap-4 rounded-16 md:gap-0 bg-white/4 p-6 text-white/60 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]">
      <div className="-mb-2 flex min-h-7 flex-wrap items-center gap-3 md:mb-4 md:flex-nowrap">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-white/35"
        />
        <h3 className="text-body text-white/60">Kodi, Infuse and others</h3>
        <span className="order-3 flex basis-full justify-end md:order-none md:ml-auto md:basis-auto">
          <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-white/6 px-2.5 text-caption font-medium text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)]">
            Via Trakt · later
          </span>
        </span>
      </div>
      <p className="mb-4 text-meta">
        These don’t send webhooks. They scrobble to Trakt, so connecting a Trakt
        account would bring them all in. That’s a bigger job: later.
      </p>
      {ROWS.map(([name, text]) => (
        <div
          className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-white/6 border-t py-3 text-body-sm last:pb-0"
          key={name}
        >
          <b className="font-semibold text-white">{name}</b>
          <span>{text}</span>
        </div>
      ))}
    </section>
  );
}
