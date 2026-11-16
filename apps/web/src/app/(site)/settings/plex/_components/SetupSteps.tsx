import NumberedSteps, {
  type NumberedStepsLayout,
} from '../../_components/NumberedSteps';

/** Each place keeps its own look on purpose; don't unify them. */
const LAYOUT: NumberedStepsLayout = {
  item: 'grid grid-cols-[24px_minmax(0,1fr)] items-start gap-x-3.5',
  list: 'flex flex-col gap-3',
  text: 'pt-0.5 text-meta text-white/80',
};

const STEPS = (first: string) => [
  first,
  'In Plex: Settings → Webhooks (under your account) → Add Webhook.',
  'Paste it, Save Changes, and finish any episode: it shows up here.',
];

/**
 * The three setup steps. Before a URL exists the
 * first step says "Create and copy"; once it does, "Copy".
 */
export default function SetupSteps({ hasUrl }: Readonly<{ hasUrl: boolean }>) {
  const first = hasUrl
    ? 'Copy your URL. It’s yours alone: anyone with it can mark episodes on your profile.'
    : 'Create and copy your URL. It’s yours alone: anyone with it can mark episodes on your profile.';
  return <NumberedSteps layout={LAYOUT} lines={STEPS(first)} />;
}
