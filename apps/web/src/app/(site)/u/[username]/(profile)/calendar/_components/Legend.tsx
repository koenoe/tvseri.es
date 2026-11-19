import { LEGEND } from './calendarStyles';

const ITEM = 'inline-flex items-center gap-1.5';

/** Under the month (desktop): what the pink dot, the cyan ring and ×N say */
export default function Legend() {
  return (
    <div className={LEGEND}>
      <span className={ITEM}>
        <span className="size-2.5 rounded-full bg-pink" />
        Premiere
      </span>
      <span className={ITEM}>
        <span className="size-2.5 rounded-full shadow-[inset_0_0_0_2.5px_#00ffff]" />
        Finale
      </span>
      <span className={ITEM}>
        <span className="h-5 min-w-5 rounded-full bg-[#121616] px-1.5 text-center text-[11px] leading-5 font-semibold text-white shadow-[0_0_0_1px_rgb(255_255_255/0.18)]">
          ×N
        </span>
        · episodes that day
      </span>
    </div>
  );
}
