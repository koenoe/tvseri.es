import type { Person } from '@tvseri.es/schemas';

import { fetchPersonTvCredits } from '@/lib/api';
import Poster from '../Tiles/Poster';
import Grid, { gridItemSizes } from './Grid';

export default async function PersonGrid({
  person,
}: Readonly<{
  person: Person;
}>) {
  const isActor = person.knownForDepartment === 'Acting';
  const { upcoming, previous } = await fetchPersonTvCredits(
    person.id,
    isActor ? 'cast' : 'crew',
  );

  return (
    <>
      {upcoming.length > 0 && (
        <div className="mb-10 lg:mb-20">
          <h3 className="mb-6 text-2xl font-medium lg:text-3xl">Upcoming</h3>
          <Grid>
            {upcoming.map((item) => (
              <Poster item={item} key={item.id} sizes={gridItemSizes} />
            ))}
          </Grid>
        </div>
      )}
      {previous.length > 0 && (
        <div>
          <h3 className="mb-6 text-2xl font-medium lg:text-3xl">Previous</h3>
          <Grid>
            {previous.map((item) => (
              <Poster item={item} key={item.id} sizes={gridItemSizes} />
            ))}
          </Grid>
        </div>
      )}
    </>
  );
}
