/** The shelf nav's parts shared by the live nav (client) and its placeholder (server) */

/** "Shelves" and its caption */
export function ShelvesHeading() {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[15px] leading-6 font-semibold">Shelves</h2>
      <span className="text-caption text-white/60">
        a series can sit on two
      </span>
    </div>
  );
}

/** The 1px rule before All shows (`.shdiv`) */
export function NavRule() {
  return <span aria-hidden="true" className="mx-3 my-1.5 h-px bg-white/8" />;
}

export const ROW =
  'relative flex h-10 items-center gap-3 rounded-8 px-3 text-[14px] leading-5 font-medium';
