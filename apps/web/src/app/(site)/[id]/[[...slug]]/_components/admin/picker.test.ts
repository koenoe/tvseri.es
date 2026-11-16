import type { SeriesImages } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  availability,
  backdropChoices,
  backdropCount,
  baseSelection,
  isChanged,
  pageColour,
  savedSelection,
  statusOf,
  step,
  TEXT_TITLE,
  tabLabels,
  titleChoices,
  titleCount,
  toPreferredImages,
} from './picker';

const backdrop = (name: string) => ({
  path: `/${name}.jpg`,
  url: `https://image.tmdb.org/t/p/w1920_and_h1080_multi_faces/${name}.jpg`,
});
const logo = (name: string, language: string | null = 'en') => ({
  height: 678,
  language,
  path: `/${name}.png`,
  url: `https://image.tmdb.org/t/p/w500/${name}.png`,
  width: 4318,
});

const IMAGES: SeriesImages = {
  automatic: { backdropPath: '/b1.jpg', titleTreatmentPath: '/l2.png' },
  backdrops: [backdrop('b0'), backdrop('b1'), backdrop('b2')],
  preferred: null,
  titleTreatment: [logo('l0', 'ja'), logo('l1'), logo('l2')],
};

const SAVED: SeriesImages = {
  ...IMAGES,
  preferred: {
    backdropColor: '#112233',
    backdropImagePath: '/b2.jpg',
    titleTreatmentImagePath: '/l0.png',
  },
};

const SERVED = { backdropPath: '/b1.jpg' };

describe('baseSelection: what visitors see now', () => {
  it('is the automatic pair when nothing is saved', () => {
    expect(baseSelection(IMAGES, SERVED)).toEqual({
      backdrop: '/b1.jpg',
      title: '/l2.png',
    });
  });

  it('is the saved pick when there is one', () => {
    expect(baseSelection(SAVED, SERVED)).toEqual({
      backdrop: '/b2.jpg',
      title: '/l0.png',
    });
  });

  it('is the text title when the saved pick says so', () => {
    const images = {
      ...IMAGES,
      preferred: {
        backdropColor: '#112233',
        backdropImagePath: '/b2.jpg',
        titleTreatment: 'text' as const,
      },
    };
    expect(baseSelection(images, SERVED).title).toBe(TEXT_TITLE);
  });

  it('keeps following the automatic logo for a saved pick without one', () => {
    const images = {
      ...IMAGES,
      preferred: { backdropColor: '#112233', backdropImagePath: '/b2.jpg' },
    };
    expect(baseSelection(images, SERVED).title).toBe('/l2.png');
  });

  it('falls back to the served backdrop and the text title when TMDB has no automatic images', () => {
    const images = {
      ...IMAGES,
      automatic: { backdropPath: null, titleTreatmentPath: null },
    };
    expect(baseSelection(images, { backdropPath: '/with-text.jpg' })).toEqual({
      backdrop: '/with-text.jpg',
      title: TEXT_TITLE,
    });
  });
});

describe('savedSelection', () => {
  it('is null when nothing is saved', () => {
    expect(savedSelection(IMAGES)).toBeNull();
  });

  it('names only what was saved explicitly', () => {
    expect(savedSelection(SAVED)).toEqual({
      backdrop: '/b2.jpg',
      title: '/l0.png',
    });
    expect(
      savedSelection({
        ...IMAGES,
        preferred: { backdropColor: '#1', backdropImagePath: '/b2.jpg' },
      }),
    ).toEqual({ backdrop: '/b2.jpg', title: null });
  });
});

describe('backdropChoices', () => {
  it('marks the automatic, the saved and the picked backdrop, with labels', () => {
    const choices = backdropChoices(SAVED, {
      backdrop: '/b0.jpg',
      title: '/l0.png',
    });
    expect(choices.map((choice) => choice.label)).toEqual([
      'Backdrop 1 of 3',
      'Backdrop 2 of 3, automatic',
      'Backdrop 3 of 3, saved',
    ]);
    expect(choices.map((choice) => choice.isPicked)).toEqual([
      true,
      false,
      false,
    ]);
    expect(choices[1]).toMatchObject({ isAuto: true, isSaved: false });
    expect(choices[2]).toMatchObject({ isAuto: false, isSaved: true });
  });
});

describe('titleChoices', () => {
  it('lists every logo and then the text title', () => {
    const choices = titleChoices(IMAGES, 'The Bear', {
      backdrop: '/b1.jpg',
      title: TEXT_TITLE,
    });
    expect(choices.map((choice) => choice.key)).toEqual([
      '/l0.png',
      '/l1.png',
      '/l2.png',
      TEXT_TITLE,
    ]);
    expect(choices.map((choice) => choice.label)).toEqual([
      'Logo 1 of 3, 4318 by 678, Japanese',
      'Logo 2 of 3, 4318 by 678, English',
      'Logo 3 of 3, 4318 by 678, English, automatic',
      'Text title: The Bear set in the display type',
    ]);
    expect(choices.at(-1)).toMatchObject({ isPicked: true, kind: 'text' });
  });

  it('marks the text title automatic when TMDB has no logo', () => {
    const images = {
      ...IMAGES,
      automatic: { backdropPath: '/b1.jpg', titleTreatmentPath: null },
      titleTreatment: [],
    };
    const choices = titleChoices(images, 'The Bear', {
      backdrop: '/b1.jpg',
      title: TEXT_TITLE,
    });
    expect(choices).toHaveLength(1);
    expect(choices[0]).toMatchObject({ isAuto: true, kind: 'text' });
  });

  it('says when a logo has no language', () => {
    const images = { ...IMAGES, titleTreatment: [logo('x', null)] };
    const [first] = titleChoices(images, 'The Bear', {
      backdrop: '/b1.jpg',
      title: '/x.png',
    });
    expect(first?.label).toBe('Logo 1 of 1, 4318 by 678, no language');
  });
});

describe('counts and tabs', () => {
  it('counts the picked backdrop', () => {
    expect(backdropCount(IMAGES, '/b2.jpg')).toBe('3 of 3');
    expect(backdropCount(IMAGES, '/not-listed.jpg')).toBe('3 on TMDB');
  });

  it('counts the picked title, the text title and no logos', () => {
    expect(titleCount(IMAGES, '/l1.png')).toBe('2 of 3');
    expect(titleCount(IMAGES, TEXT_TITLE)).toBe('Text title');
    expect(titleCount({ ...IMAGES, titleTreatment: [] }, TEXT_TITLE)).toBe(
      'No logos on TMDB',
    );
  });

  it('labels the phone tabs', () => {
    expect(tabLabels(IMAGES)).toEqual({
      backdrop: 'Backdrop · 3',
      title: 'Title · 3',
    });
    expect(tabLabels({ ...IMAGES, titleTreatment: [] }).title).toBe(
      'Title · text',
    );
  });
});

describe('availability: the Remote key', () => {
  it('is open with several backdrops or any logo', () => {
    expect(availability(IMAGES, SERVED)).toEqual({ canChoose: true });
    expect(
      availability(
        { ...IMAGES, backdrops: [backdrop('b1')], titleTreatment: [logo('a')] },
        SERVED,
      ),
    ).toEqual({ canChoose: true });
  });

  it('says why when there is nothing to choose', () => {
    expect(
      availability(
        { ...IMAGES, backdrops: [backdrop('b1')], titleTreatment: [] },
        SERVED,
      ),
    ).toEqual({
      canChoose: false,
      why: '1 backdrop, no logos: nothing to choose',
    });
    expect(
      availability(
        {
          ...IMAGES,
          automatic: { backdropPath: null, titleTreatmentPath: null },
          backdrops: [],
          titleTreatment: [logo('a')],
        },
        { backdropPath: null },
      ),
    ).toEqual({ canChoose: false, why: 'No backdrops: nothing to choose' });
    expect(
      availability(
        { ...IMAGES, backdrops: [], titleTreatment: [] },
        { backdropPath: null },
      ),
    ).toEqual({
      canChoose: false,
      why: 'No backdrops, no logos: nothing to choose',
    });
  });
});

describe('statusOf', () => {
  it('reads Saving, Unsaved, saved or Automatic', () => {
    expect(statusOf({ busy: true, changed: true, hasSaved: true })).toEqual({
      kind: 'busy',
      label: 'Saving…',
    });
    expect(statusOf({ busy: false, changed: true, hasSaved: false })).toEqual({
      kind: 'dirty',
      label: 'Unsaved',
    });
    expect(statusOf({ busy: false, changed: false, hasSaved: true })).toEqual({
      kind: 'idle',
      label: 'Your pick · saved',
    });
    expect(statusOf({ busy: false, changed: false, hasSaved: false })).toEqual({
      kind: 'idle',
      label: 'Automatic',
    });
  });
});

describe('pageColour: now → after saving', () => {
  it('shows both colours when the pick changes it, as the API serves them', () => {
    expect(pageColour('#29251f', '#46462d')).toEqual({
      after: '#46462d',
      caption: 'After saving',
      changed: true,
      now: '#29251f',
    });
  });

  it('is unchanged for the same colour (any case) or before the new one is known', () => {
    expect(pageColour('#29251f', '#29251F')).toMatchObject({
      after: '#29251f',
      caption: 'Unchanged',
      changed: false,
    });
    expect(pageColour('#29251f', undefined)).toMatchObject({
      caption: 'Unchanged',
      changed: false,
    });
  });
});

describe('isChanged and step', () => {
  it('compares a pick with what visitors see', () => {
    const base = { backdrop: '/b1.jpg', title: '/l2.png' };
    expect(isChanged(base, { ...base })).toBe(false);
    expect(isChanged(base, { ...base, title: TEXT_TITLE })).toBe(true);
  });

  it('steps within a strip and stops at both ends', () => {
    const keys = ['a', 'b', 'c'];
    expect(step(keys, 'b', 1)).toBe('c');
    expect(step(keys, 'c', 1)).toBe('c');
    expect(step(keys, 'a', -1)).toBe('a');
    expect(step(keys, 'missing', 1)).toBe('a');
  });
});

describe('toPreferredImages: the save payload', () => {
  it('saves the backdrop, its colour and the logo', () => {
    expect(
      toPreferredImages({ backdrop: '/b2.jpg', title: '/l0.png' }, '#585838'),
    ).toEqual({
      backdropColor: '#585838',
      backdropImagePath: '/b2.jpg',
      titleTreatmentImagePath: '/l0.png',
    });
  });

  it('saves the text title as titleTreatment "text"', () => {
    expect(
      toPreferredImages({ backdrop: '/b2.jpg', title: TEXT_TITLE }, '#585838'),
    ).toEqual({
      backdropColor: '#585838',
      backdropImagePath: '/b2.jpg',
      titleTreatment: 'text',
    });
  });

  it('has nothing to save without a backdrop or its colour', () => {
    expect(toPreferredImages({ backdrop: null, title: TEXT_TITLE }, '#1')).toBe(
      null,
    );
    expect(
      toPreferredImages({ backdrop: '/b2.jpg', title: TEXT_TITLE }, undefined),
    ).toBe(null);
  });
});
