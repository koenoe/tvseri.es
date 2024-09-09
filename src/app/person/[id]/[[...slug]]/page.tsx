import { notFound, permanentRedirect } from 'next/navigation';

import Page from '@/components/Page/Page';
import detectDominantColorFromImage from '@/lib/detectDominantColorFromImage';
import { fetchPerson } from '@/lib/tmdb';
import getBaseUrl from '@/utils/getBaseUrl';

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

  const backdropImageUrl = `${getBaseUrl()}/api/person/${person.id}/background?output=jpg`;
  const backdropColor = await detectDominantColorFromImage(
    `${backdropImageUrl}`,
  );

  return (
    <Page backgroundColor={backdropColor} backgroundImage={backdropImageUrl}>
      <div className="container min-h-screen">hoi</div>
    </Page>
  );
}
