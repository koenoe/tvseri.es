import { describe, expect, it } from 'vitest';

import { detectSource, isCombinedColumn } from './columns';

describe('detectSource', () => {
  it('Title,Date is Netflix: Title feeds show, season and episode', () => {
    expect(detectSource(['Title', 'Date'])).toEqual({
      kind: 'netflix',
      mapping: {
        date: 'Date',
        episode: 'Title',
        season: 'Title',
        service: { kind: 'fixed', name: 'Netflix' },
        show: 'Title',
      },
      recognised: true,
    });
  });

  it('maps our own history export (title,season,episode,date,watchProvider)', () => {
    expect(
      detectSource(['title', 'season', 'episode', 'date', 'watchProvider']),
    ).toEqual({
      kind: 'csv',
      mapping: {
        date: 'date',
        episode: 'episode',
        season: 'season',
        service: { column: 'watchProvider', kind: 'column' },
        show: 'title',
      },
      recognised: true,
    });
    expect(
      detectSource(['Show', 'Episode', 'Watch provider']).mapping,
    ).toMatchObject({ service: { column: 'Watch provider', kind: 'column' } });
  });

  it('tolerates a BOM and case on the Netflix header', () => {
    expect(detectSource(['﻿title', ' DATE ']).kind).toBe('netflix');
  });

  it('maps other files on header names, case-insensitively', () => {
    const { kind, mapping, recognised } = detectSource([
      'Series',
      'S',
      'E',
      'Watched on',
      'Where',
    ]);
    expect(kind).toBe('csv');
    expect(recognised).toBe(true);
    expect(mapping).toEqual({
      date: 'Watched on',
      episode: 'E',
      season: 'S',
      service: { column: 'Where', kind: 'column' },
      show: 'Series',
    });
  });

  it('knows the other names for each field', () => {
    expect(
      detectSource(['NAME', 'ep', 'watched at', 'platform']).mapping,
    ).toEqual({
      date: 'watched at',
      episode: 'ep',
      season: '',
      service: { column: 'platform', kind: 'column' },
      show: 'NAME',
    });
    expect(
      detectSource(['show', 'season', 'episode', 'date', 'provider']),
    ).toMatchObject({ mapping: { service: { column: 'provider' } } });
  });

  it('has no service column: kind none', () => {
    expect(detectSource(['Show', 'Episode']).mapping.service).toEqual({
      kind: 'none',
    });
  });

  it('is not recognised when show or episode stays unmapped', () => {
    expect(detectSource(['Show', 'Date']).recognised).toBe(false);
    expect(detectSource(['Episode', 'Date']).recognised).toBe(false);
    expect(detectSource(['Title', 'Date', 'Type']).recognised).toBe(false);
    expect(detectSource([]).recognised).toBe(false);
  });

  it('gives a header to one field only', () => {
    // "Title" is the show; the episode must come from its own column
    const { mapping } = detectSource(['Title', 'Episode']);
    expect(mapping.show).toBe('Title');
    expect(mapping.episode).toBe('Episode');
  });
});

describe('isCombinedColumn', () => {
  const rows = [
    { Series: 'Severance', Title: 'Taken: Natalee Holloway: Part 1' },
    { Series: 'Slow Horses', Title: 'Beat Luke Littler' },
  ];

  it('is true when a value holds ": "', () => {
    expect(isCombinedColumn(rows, 'Title')).toBe(true);
  });

  it('is false for plain names, numbers and no column', () => {
    expect(isCombinedColumn(rows, 'Series')).toBe(false);
    expect(isCombinedColumn([{ S: 3 }], 'S')).toBe(false);
    expect(isCombinedColumn(rows, '')).toBe(false);
    expect(isCombinedColumn(rows, 'Missing')).toBe(false);
  });
});
