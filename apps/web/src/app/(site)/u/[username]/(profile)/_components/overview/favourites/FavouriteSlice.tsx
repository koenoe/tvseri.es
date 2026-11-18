import {
  type SliceParts,
  showSlice,
} from '@/components/ui/accordion/showSlice';
import showPath from '@/lib/routing/showPath';
import { favouriteFacts, type Relation } from './favouriteFacts';
import type { Tile } from './loadFavourites';
import RelationPill from './RelationPill';

/**
 * One favourite: backdrop, the title treatment and facts while
 * open, its name on a closed row below xl, the show's ⋯. A visitor gets the
 * relation pill top left and no history fact.
 */
export function favouriteSlice({
  eager,
  now,
  relation,
  tile,
  viewer,
}: Readonly<{
  eager: boolean;
  now: number;
  /** Visitor only: what the show is to the person looking */
  relation: Relation | null;
  tile: Tile;
  viewer: 'owner' | 'visitor';
}>): SliceParts {
  const { facts, item, series } = tile;
  const href = showPath(item.id, item.slug);
  const backdrop = facts?.backdropImage || series?.backdropImage;
  const shown = facts
    ? favouriteFacts(facts, { history: viewer === 'owner', now })
    : [];
  return showSlice({
    backdrop,
    facts: shown,
    href,
    left: relation ? <RelationPill relation={relation} /> : null,
    loading: eager ? 'eager' : 'lazy',
    logo: series?.titleTreatmentImage,
    seriesId: item.id,
    title: item.title,
  });
}
