import {
  buildBackdropImageUrl,
  buildLogoImageUrl,
  buildPosterImageUrl,
  buildProfileImageUrl,
  buildStillImageUrl,
  buildTitleTreatmentImageUrl,
} from '@tvseri.es/utils';
import { describe, expect, it } from 'vitest';

import tmdbImageLoader from './tmdbImageLoader';

const load = (src: string, width: number) =>
  tmdbImageLoader({ quality: 75, src, width });

describe('tmdbImageLoader', () => {
  it('picks the smallest poster size at least as wide as asked', () => {
    const src = buildPosterImageUrl('/abc.jpg');
    expect(load(src, 92)).toBe('https://image.tmdb.org/t/p/w92/abc.jpg');
    expect(load(src, 100)).toBe('https://image.tmdb.org/t/p/w154/abc.jpg');
    expect(load(src, 185)).toBe('https://image.tmdb.org/t/p/w185/abc.jpg');
  });

  it('serves larger posters from the larger TMDB sizes, never original', () => {
    const src = buildPosterImageUrl('/abc.jpg');
    expect(load(src, 300)).toBe(
      'https://image.tmdb.org/t/p/w300_and_h450_bestv2/abc.jpg',
    );
    expect(load(src, 342)).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
    expect(load(src, 484)).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
    expect(load(src, 780)).toBe('https://image.tmdb.org/t/p/w780/abc.jpg');
    expect(load(src, 3840)).toBe('https://image.tmdb.org/t/p/w780/abc.jpg');
  });

  it('gives backdrops and stills the same 16:9 ladder, capped at the 1920 crop', () => {
    const backdrop = buildBackdropImageUrl('/b.jpg');
    expect(load(backdrop, 382)).toBe('https://image.tmdb.org/t/p/w500/b.jpg');
    expect(load(backdrop, 780)).toBe('https://image.tmdb.org/t/p/w780/b.jpg');
    expect(load(backdrop, 1000)).toBe('https://image.tmdb.org/t/p/w1280/b.jpg');
    expect(load(backdrop, 3500)).toBe(
      'https://image.tmdb.org/t/p/w1920_and_h1080_multi_faces/b.jpg',
    );
    const still = buildStillImageUrl('/s.jpg');
    expect(load(still, 64)).toBe('https://image.tmdb.org/t/p/w92/s.jpg');
    expect(load(still, 200)).toBe('https://image.tmdb.org/t/p/w300/s.jpg');
    // the episode modal's 1320px still is no longer a 454px file
    expect(load(still, 1320)).toBe(
      'https://image.tmdb.org/t/p/w1920_and_h1080_multi_faces/s.jpg',
    );
  });

  it('gives any plain width (logos, Home’s w300 stills) the plain ladder', () => {
    expect(load(buildTitleTreatmentImageUrl('/t.png'), 300)).toBe(
      'https://image.tmdb.org/t/p/w300/t.png',
    );
    expect(load(buildTitleTreatmentImageUrl('/t.png'), 920)).toBe(
      'https://image.tmdb.org/t/p/w1280/t.png',
    );
    expect(load(buildLogoImageUrl('/l.png'), 28)).toBe(
      'https://image.tmdb.org/t/p/w45/l.png',
    );
    expect(load(buildStillImageUrl('/s.jpg', 'w300'), 400)).toBe(
      'https://image.tmdb.org/t/p/w500/s.jpg',
    );
  });

  it('keeps the face crop, at twice the size when asked', () => {
    const src = buildProfileImageUrl('/f.jpg', 'w138_and_h175_face');
    expect(load(src, 96)).toBe(src);
    expect(load(src, 256)).toBe(
      'https://image.tmdb.org/t/p/w276_and_h350_face/f.jpg',
    );
  });

  it('maps profiles to their own ladder', () => {
    const src = buildProfileImageUrl('/p.jpg');
    expect(load(src, 144)).toBe('https://image.tmdb.org/t/p/w185/p.jpg');
    expect(load(src, 256)).toBe(
      'https://image.tmdb.org/t/p/w300_and_h450_bestv2/p.jpg',
    );
    expect(load(src, 400)).toBe('https://image.tmdb.org/t/p/h632/p.jpg');
    expect(load(src, 1200)).toBe(
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/p.jpg',
    );
  });

  it('honours the width Next probes with (400) for every kind', () => {
    for (const src of [
      buildPosterImageUrl('/a.jpg'),
      buildBackdropImageUrl('/a.jpg'),
      buildStillImageUrl('/a.jpg'),
      buildProfileImageUrl('/a.jpg'),
      buildLogoImageUrl('/a.png'),
    ]) {
      expect(load(src, 400)).not.toBe(src);
    }
  });

  it('returns other hosts and unknown sizes unchanged', () => {
    expect(load('/local.svg', 300)).toBe('/local.svg');
    expect(load('https://example.com/a.jpg', 300)).toBe(
      'https://example.com/a.jpg',
    );
    expect(load('https://image.tmdb.org/t/p/w45_and_h45_face/x.jpg', 300)).toBe(
      'https://image.tmdb.org/t/p/w45_and_h45_face/x.jpg',
    );
    expect(load('https://image.tmdb.org/t/p/original/x.jpg', 300)).toBe(
      'https://image.tmdb.org/t/p/original/x.jpg',
    );
  });
});
