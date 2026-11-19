import NumberedSteps, {
  type NumberedStepsLayout,
} from '../../_components/NumberedSteps';

/** Each place keeps its own look on purpose; don't unify them. */
const LAYOUT: NumberedStepsLayout = {
  item: 'grid grid-cols-[24px_minmax(0,1fr)] items-start gap-x-3.5',
  list: 'flex flex-col gap-3',
  text: 'pt-0.5 text-meta text-white/80',
};

/** An app card's setup steps (Plex's webhook, a service's extension link). */
export default function SetupSteps({
  lines,
}: Readonly<{ lines: ReadonlyArray<string> }>) {
  return <NumberedSteps layout={LAYOUT} lines={lines} />;
}
