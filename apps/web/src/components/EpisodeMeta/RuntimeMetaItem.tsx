import { ClockOutlineIcon } from '@/components/Icons/ClockOutlineIcon';
import MetaItem from '@/components/MetaRow/MetaItem';
import formatRuntime from '@/utils/formatRuntime';

/**
 * An episode's runtime in a `MetaRow`, with the clock icon; nothing when it's
 * unknown (0). WatchedMeta should move to this when History is redesigned.
 */
export default function RuntimeMetaItem({
  minutes,
}: Readonly<{
  minutes?: number | null;
}>) {
  const runtime = minutes ? formatRuntime(minutes) : null;

  return <MetaItem icon={ClockOutlineIcon}>{runtime}</MetaItem>;
}
