import { notFound, permanentRedirect } from 'next/navigation';

import Page from '@/components/Page/Page';
import detectDominantColorFromImageWithCache from '@/lib/detectDominantColorFromImage';
import { fetchPerson, fetchPersonKnownFor } from '@/lib/tmdb';

type Props = Readonly<{
  params: { id: string; slug: string[] };
}>;

export async function generateMetadata({ params }: Props) {
  const person = await fetchPerson(params.id);

  if (!person || person.isAdult) {
    return {};
  }

  const slug = params.slug?.join('');

  if (person.slug && person.slug !== slug) {
    return permanentRedirect(`/person/${params.id}/${person.slug}`);
  }

  return {
    title: person.name,
    description: person.biography,
    alternates: {
      // TODO: does this need to be absolute?
      canonical: `/tv/${params.id}/${person.slug}`,
    },
  };
}

export default async function PersonDetailsPage({ params }: Props) {
  const person = await fetchPerson(params.id);

  if (!person || person.isAdult) {
    return notFound();
  }

  const slug = params.slug?.join('');

  if (person.slug && person.slug !== slug) {
    return permanentRedirect(`/person/${params.id}/${person.slug}`);
  }

  const knownForItems = await fetchPersonKnownFor(person);
  const knownForTvSeries = knownForItems.filter(
    (item) => 'firstAirDate' in item,
  );
  const knownForFirstItem =
    knownForTvSeries.length > 0 ? knownForTvSeries[0] : knownForItems[0];
  const backdropImage = knownForFirstItem?.backdropImage ?? person.image;
  const backdropColor =
    await detectDominantColorFromImageWithCache(backdropImage);

  return (
    <Page
      backgroundContext="blur"
      backgroundColor={backdropColor}
      backgroundImage={backdropImage}
    >
      <div className="container">
        {JSON.stringify({
          ...person,
          knownFor: knownForItems,
        })}
      </div>
    </Page>
  );
}
