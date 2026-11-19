import type { ConnectionService } from '@tvseri.es/schemas';

import { bbcReader } from '@/lib/bbc/reader';
import { netflixReader } from '@/lib/netflix/reader';
import { primeReader } from '@/lib/prime/reader';

import type { ServiceReader } from './reader';

/** A new service is one entry here */
export const READERS: Readonly<Record<ConnectionService, ServiceReader>> = {
  bbc: bbcReader,
  netflix: netflixReader,
  prime: primeReader,
};
