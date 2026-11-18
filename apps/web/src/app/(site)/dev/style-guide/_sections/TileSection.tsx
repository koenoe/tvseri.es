import BackdropTile from '@/components/ui/tile/BackdropTile';
import PosterTile from '@/components/ui/tile/PosterTile';

import { BACKDROPS, SHOWS, ShowPoster } from './RowSection';
import Section from './Section';

const [breakingBad, severance] = SHOWS;
const [slowHorses, , mobLand] = BACKDROPS;

function Specimen({
  children,
  label,
  width,
}: Readonly<{ children: React.ReactNode; label: string; width: string }>) {
  return (
    <figure className={width}>
      {children}
      <figcaption className="mt-3 text-caption text-white/60">
        {label}
      </figcaption>
    </figure>
  );
}

export default function TileSection() {
  return (
    <Section id="tiles" source="tiles (hover and Tab them)" title="Tiles">
      <div className="flex flex-wrap items-start gap-6">
        <Specimen label="Poster 220 · rest, hover grows 4%" width="w-55">
          <ShowPoster show={{ ...breakingBad!, watched: false }} />
        </Specimen>
        <Specimen label="Watched label" width="w-55">
          <ShowPoster show={severance!} />
        </Specimen>
        <Specimen label="No poster: placeholder" width="w-55">
          <PosterTile
            id={1}
            poster={null}
            title="The Bletchley Circle: San Francisco"
          />
        </Specimen>
        <Specimen label="Line below" width="w-55">
          <PosterTile
            id={breakingBad!.id}
            poster={breakingBad!.poster}
            slug={breakingBad!.slug}
            title={breakingBad!.title}
          >
            <span className="text-meta text-white/60">Top rated crime</span>
          </PosterTile>
        </Specimen>
        <Specimen label="16:9 with logo" width="w-96">
          <BackdropTile {...slowHorses!} />
        </Specimen>
        <Specimen label="16:9 without logo: the title" width="w-96">
          <BackdropTile {...mobLand!} />
        </Specimen>
      </div>
    </Section>
  );
}
