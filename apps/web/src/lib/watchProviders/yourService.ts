import type { WatchProvider } from '@tvseri.es/schemas';

const PLAN = /\s+(?:standard|basic|premium)?\s*with ads$/i;
const CHANNEL = /\s(?:amazon|apple tv|roku premium)?\s*channel$/i;

/** "Netflix Standard with Ads" is Netflix; other names stay as they are. */
export const foldPlan = (name: string): string => name.replace(PLAN, '').trim();

/** "Apple TV Amazon Channel": a channel never counts as one of yours. */
export const isChannel = (name: string): boolean => CHANNEL.test(name);

const key = (name: string) => foldPlan(name).toLowerCase();

/**
 * Which of the viewer's services a show is on: the first of theirs, in
 * their order, that streams it (by id, or by name with an ads plan folded
 * in), never a channel; none when it isn't on any of theirs. Where to watch
 * shows it ("On your Netflix") and a mark records it.
 */
export function yourService(
  stream: ReadonlyArray<WatchProvider>,
  services: ReadonlyArray<Pick<WatchProvider, 'id' | 'name'>> | undefined,
): WatchProvider | null {
  const own = stream.filter((provider) => !isChannel(provider.name));
  for (const service of services ?? []) {
    const name = key(service.name);
    const match = own.find(
      (provider) => provider.id === service.id || key(provider.name) === name,
    );
    if (match) {
      return match;
    }
  }
  return null;
}
