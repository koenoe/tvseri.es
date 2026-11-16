import { GHOST_FILL } from '@/components/ui/row/RowGhosts';

/** Jump to before the years land: six ghost rows */
export default function JumpToSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex animate-ghost flex-col gap-0.5"
      data-placeholder="history-jump"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <span className="flex h-9 items-center px-3" key={index}>
          <span className={`h-3.5 w-full rounded-8 ${GHOST_FILL}`} />
        </span>
      ))}
    </div>
  );
}
