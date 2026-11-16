import ArrowText from './ArrowText';

/** One place's look for the list: its list, row and text classes */
export type NumberedStepsLayout = Readonly<{
  item: string;
  list: string;
  text: string;
}>;

/** The numbered circle, shared by every list of steps in Settings */
const NUMBER =
  'flex size-6 items-center justify-center rounded-full bg-white/10 text-caption';

/**
 * Settings' numbered steps (the Plex setup, the import help): a 24px circle
 * with the step's number, then its line (`ArrowText` draws the → in it).
 */
export default function NumberedSteps({
  layout,
  lines,
}: Readonly<{ layout: NumberedStepsLayout; lines: ReadonlyArray<string> }>) {
  return (
    <ol className={layout.list}>
      {lines.map((line, index) => (
        <li className={layout.item} key={line}>
          <span className={NUMBER}>{index + 1}</span>
          <span className={layout.text}>
            <ArrowText text={line} />
          </span>
        </li>
      ))}
    </ol>
  );
}
