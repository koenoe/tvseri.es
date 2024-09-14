import { Suspense } from 'react';

import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';

import ExpandableText from '@/components/ExpandableText/ExpandableText';
import Grid from '@/components/Grid/Grid';
import PersonGrid from '@/components/Grid/PersonGrid';
import Page from '@/components/Page/Page';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';
import Poster from '@/components/Tiles/Poster';
import detectDominantColorFromImageWithCache from '@/lib/detectDominantColorFromImage';
import { fetchPerson, fetchPersonKnownFor } from '@/lib/tmdb';
import { type Movie } from '@/types/movie';
import { type TvSeries } from '@/types/tv-series';
import calculateAge from '@/utils/calculateAge';
import formatDate from '@/utils/formatDate';
import isTvSeries from '@/utils/isTvSeries';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

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

  const knownForItems = (await fetchPersonKnownFor(person)) as (
    | TvSeries
    | Movie
  )[];
  const knownForTvSeries = knownForItems.filter(isTvSeries);
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
      <div className="my-10 md:container md:my-20">
        <div className="grid max-w-screen-xl grid-cols-1 md:grid-cols-3 [&>*]:!h-auto [&>*]:!w-full">
          <div className="mb-10 px-[2rem] md:mb-0 md:px-0">
            <div className="relative h-auto w-full overflow-hidden rounded-lg pt-[150%] shadow-lg after:absolute after:inset-0 after:rounded-lg after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:mx-0">
              {person.image ? (
                <Image
                  className="rounded-lg object-cover"
                  draggable={false}
                  src={person.image}
                  alt={person.name}
                  fill
                  unoptimized
                  priority
                  placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(300, 450)}`}
                />
              ) : (
                <div className="absolute inset-0 h-full w-full overflow-hidden rounded-lg bg-white/5" />
              )}
            </div>
          </div>

          <div className="col-span-2">
            <div className="px-[2rem] md:pl-12 lg:pl-16">
              <h1 className="mb-3 w-full text-3xl font-bold !leading-tight md:text-4xl lg:text-5xl xl:text-6xl">
                {person.name}
              </h1>
              <div className="mb-4 flex w-full items-center gap-[0.2rem] text-nowrap text-[0.65rem] leading-relaxed lg:gap-2 lg:text-xs xl:text-sm">
                <div className="opacity-75">{person.placeOfBirth}</div>
                {person.birthdate && (
                  <div className="opacity-75 before:mr-1 before:content-['·'] lg:before:mr-2">
                    {formatDate(person.birthdate)}
                    {person.deathdate && (
                      <>
                        <span className="mx-1">–</span>
                        {formatDate(person.deathdate)}
                      </>
                    )}
                  </div>
                )}
                {person.birthdate && (
                  <div className="opacity-75 md:before:mr-1 md:before:content-['·'] lg:before:mr-2">
                    <span className="hidden md:inline-block">
                      {calculateAge(person.birthdate, person.deathdate)} years
                    </span>
                    {person.deathdate && (
                      <span className="ml-1 align-middle text-base leading-none">
                        †
                      </span>
                    )}
                  </div>
                )}
              </div>
              <ExpandableText className="mb-10">
                {person.biography}
              </ExpandableText>
            </div>
            <h2 className="px-[2rem] text-2xl font-medium md:pl-12 lg:pl-16">
              Known for
            </h2>
            <div className="relative flex w-full flex-nowrap gap-4 overflow-x-scroll pb-6 pe-[2rem] ps-[2rem] pt-6 scrollbar-hide md:pe-12 md:ps-12 lg:gap-6 lg:pe-16 lg:ps-16">
              {knownForItems.map((item) => (
                <Poster key={item.id} item={item} size="small" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        <Suspense
          fallback={
            <>
              <div className="mb-6 h-8 w-2/12 bg-white/20" />
              <Grid>
                {[...Array(18)].map((_, index) => (
                  <SkeletonPoster key={index} />
                ))}
              </Grid>
            </>
          }
        >
          <PersonGrid person={person} />
        </Suspense>
      </div>
    </Page>
  );
}
