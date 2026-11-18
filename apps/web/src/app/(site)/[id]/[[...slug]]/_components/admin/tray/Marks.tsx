import { checkGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

/** The tick on the pick, and the Auto and Saved tags. */
export default function Marks({
  isAuto,
  isPicked,
  isSaved,
}: Readonly<{ isAuto: boolean; isPicked: boolean; isSaved: boolean }>) {
  return (
    <>
      {isPicked ? (
        <span className="absolute top-[5px] right-[5px] flex size-5 items-center justify-center rounded-full bg-white text-[#171717]">
          <Icon glyph={checkGlyph} size={13} />
        </span>
      ) : null}
      {isAuto || isSaved ? (
        <span className="absolute bottom-[5px] left-[5px] flex gap-1">
          {isAuto ? <Tag>Auto</Tag> : null}
          {isSaved ? <Tag>Saved</Tag> : null}
        </span>
      ) : null}
    </>
  );
}

function Tag({ children }: Readonly<{ children: string }>) {
  return (
    <i className="h-[18px] rounded-[5px] bg-[rgb(10_10_10/0.78)] px-1.5 text-[11px] leading-[18px] font-medium text-white not-italic">
      {children}
    </i>
  );
}

type Marked = Readonly<{
  isAuto: boolean;
  isPicked: boolean;
  isSaved: boolean;
  key: string;
  label: string;
}>;

/**
 * For `memo`: an option re-renders only when what it draws changed (its
 * choice object is rebuilt on every pick).
 */
export function sameOption<
  P extends Readonly<{ choice: Marked; locked: boolean; tabbable: boolean }>,
>(before: P, after: P): boolean {
  const keys = Object.keys(after) as Array<keyof P>;
  return keys.every((key) =>
    key === 'choice'
      ? before.choice.key === after.choice.key &&
        before.choice.label === after.choice.label &&
        before.choice.isPicked === after.choice.isPicked &&
        before.choice.isAuto === after.choice.isAuto &&
        before.choice.isSaved === after.choice.isSaved
      : Object.is(before[key], after[key]),
  );
}
