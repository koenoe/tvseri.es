import { fetchPersonTvCredits } from '@/lib/tmdb';
import { type Person } from '@/types/person';

import Grid from './Grid';
import Poster from '../Tiles/Poster';

export default async function PersonGrid({
  person,
}: Readonly<{
  person: Person;
}>) {
  const { cast, crew } = await fetchPersonTvCredits(person.id);
  const isActor = person.knownForDepartment === 'Acting';
  const upcoming = isActor ? cast.upcoming : crew.upcoming;
  const previous = isActor ? cast.previous : crew.previous;

  return (
    <>
      {upcoming.length > 0 && (
        <div>
          <h3 className="mb-6 text-2xl font-medium lg:text-3xl">Upcoming</h3>
          <Grid>
            {upcoming.map((item) => (
              <Poster key={item.id} item={item} />
            ))}
          </Grid>
        </div>
      )}
      {previous.length > 0 && (
        <div>
          <h3 className="mb-6 text-2xl font-medium lg:text-3xl">Previous</h3>
          <Grid>
            {previous.map((item) => (
              <Poster key={item.id} item={item} />
            ))}
          </Grid>
        </div>
      )}
    </>
  );
}
