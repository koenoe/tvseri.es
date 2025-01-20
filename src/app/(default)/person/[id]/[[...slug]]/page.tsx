import { cache, Suspense } from 'react';

import { cx } from 'class-variance-authority';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';

import ExpandableText from '@/components/ExpandableText/ExpandableText';
import Grid from '@/components/Grid/Grid';
import PersonGrid from '@/components/Grid/PersonGrid';
import KnownFor from '@/components/KnownFor/KnownFor';
import Page from '@/components/Page/Page';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';
import { cachedPerson as _cachedPerson } from '@/lib/cached';
import calculateAge from '@/utils/calculateAge';
import formatDate from '@/utils/formatDate';
import getBaseUrl from '@/utils/getBaseUrl';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

type Props = Readonly<{
  params: Promise<{ id: string; slug: string[] }>;
}>;

const cachedPerson = cache(_cachedPerson);

export async function generateMetadata({ params: paramsFromProps }: Props) {
  const params = await paramsFromProps;
  const person = await cachedPerson(params.id);

  if (!person || person.isAdult) {
    return {};
  }

  const slug = params.slug?.join('');

  if (person.slug && person.slug !== slug) {
    return {};
  }

  const canonicalUrl = `${getBaseUrl()}/tv/${params.id}/${person.slug}`;

  return {
    title: person.name,
    description: person.biography,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: person.name,
      description: person.biography,
      url: canonicalUrl,
      siteName: 'tvseri.es',
      images: person.image
        ? [
            {
              url: person.image,
              width: 600,
              height: 900,
              alt: `${person.name} poster`,
            },
          ]
        : undefined,
      locale: 'en_US',
      type: 'profile',
    },
  };
}

export default async function PersonDetailsPage({
  params: paramsFromProps,
}: Props) {
  const params = await paramsFromProps;
  const person = await cachedPerson(params.id);

  if (!person || person.isAdult) {
    return notFound();
  }

  const slug = params.slug?.join('');

  if (person.slug && person.slug !== slug) {
    return permanentRedirect(`/person/${params.id}/${person.slug}`);
  }

  return (
    <Page backgroundContext="dots">
      <div className="my-10 md:container md:my-20">
        <div className="grid max-w-screen-xl grid-cols-1 md:grid-cols-3 [&>*]:!h-auto [&>*]:!w-full">
          <div className="mb-10 px-[2rem] md:mb-0 md:px-0">
            <Link
              href={`https://www.imdb.com/name/${person.imdbId}`}
              target="_blank"
            >
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
            </Link>
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
                {person.biography
                  ?.trim()
                  .split('\n')
                  .filter((section) => section !== '')
                  .map((section, i, sections) => (
                    <p
                      key={i}
                      className={cx({
                        'mb-4': i < sections.length - 1,
                      })}
                    >
                      {section}
                    </p>
                  ))}
              </ExpandableText>
            </div>
            <Suspense
              fallback={
                <>
                  <div className="mx-[2rem] mb-2 mt-6 h-7 w-2/12 bg-white/20 md:ml-12 lg:ml-16" />
                  <div className="relative flex w-full flex-nowrap gap-4 overflow-x-scroll px-[2rem] pb-6 pt-6 scrollbar-hide md:px-12 lg:gap-6 lg:px-16">
                    {[...Array(3)].map((_, index) => (
                      <SkeletonPoster key={index} size="small" />
                    ))}
                  </div>
                </>
              }
            >
              <KnownFor item={person} />
            </Suspense>
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
