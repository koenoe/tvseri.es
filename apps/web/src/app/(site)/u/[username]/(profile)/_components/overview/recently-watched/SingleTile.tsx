import PosterLink from '@/components/ui/tile/PosterLink';
import NewToYouTag from '../../blocks/NewToYouTag';

import Slot from './Slot';
import {
  NEW_TAG,
  NEW_TAG_TEXT,
  RECENT_POSTER,
  RECENT_POSTER_SIZES,
  type TileData,
  TileLabel,
} from './tiles';

/** One episode on its own: the poster, its code and day, a link to the show */
export default function SingleTile({ tile }: Readonly<{ tile: TileData }>) {
  const episode = tile.episodes[0];
  return (
    <Slot>
      {tile.isNew ? (
        <NewToYouTag
          className={NEW_TAG}
          textClassName={NEW_TAG_TEXT}
          variant="art"
        />
      ) : null}
      <div className="flex flex-col gap-2.5">
        <PosterLink
          href={tile.href}
          label={`${tile.title}, ${tile.range}`}
          look={RECENT_POSTER}
          poster={tile.poster}
          sizes={RECENT_POSTER_SIZES}
          title={tile.title}
        />
        {episode ? <TileLabel code={episode.code} when={episode.when} /> : null}
      </div>
    </Slot>
  );
}
