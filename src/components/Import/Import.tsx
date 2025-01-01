'use client';

import { type Field } from '@/hooks/useCsvParser';

import CsvImporter from '../CsvImporter/CsvImporter';

type Part = 'title' | 'season' | 'episode';

const getDelimiter = (value: string): string => {
  const colonCount = (value.match(/:\s/g) || []).length;
  const dashCount = (value.match(/-\s/g) || []).length;
  const emDashCount = (value.match(/–\s/g) || []).length;

  return colonCount >= dashCount && colonCount >= emDashCount
    ? ': '
    : dashCount >= emDashCount
      ? '- '
      : '– ';
};

const formatPart = (value: string, part: Part): string => {
  const seasonMatch = value.match(
    /(?:Season|Series|Part)\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)|Limited Series|[A-Z][a-z]+(?:st|nd|rd|th) Season/i,
  );

  if (seasonMatch) {
    if (part === 'title') {
      return value
        .substring(0, seasonMatch.index)
        .trim()
        .replace(/[:\\—–-]\s*$/, '');
    }
    if (part === 'season') {
      return seasonMatch[0];
    }
    if (part === 'episode') {
      return value
        .substring(seasonMatch.index! + seasonMatch[0].length)
        .trim()
        .replace(/^[:\\—–-]\s*/, '');
    }
  }

  const delimiter = getDelimiter(value);
  const parts = value.split(delimiter);

  if (parts.length > 2) {
    if (part === 'title') return parts.slice(0, -1).join(delimiter);
    if (part === 'season') return '';
    if (part === 'episode') return parts[parts.length - 1];
  }

  if (parts.length > 1) {
    if (part === 'title') return parts[0];
    if (part === 'season') return '';
    if (part === 'episode') return parts.slice(1).join(delimiter);
  }

  if (part === 'title') return value;
  return '';
};

const fields: Field[] = [
  {
    label: 'Title',
    value: 'title',
    format: (value) => formatPart(value, 'title'),
  },
  {
    label: 'Date',
    value: 'date',
  },
  {
    label: 'Season',
    value: 'season',
    format: (value) => formatPart(value, 'season'),
  },
  {
    label: 'Episode',
    value: 'episode',
    format: (value) => formatPart(value, 'episode'),
  },
  {
    label: 'Streaming service',
    value: 'watchProvider',
    predefined: [
      'Netflix',
      'Prime Video',
      'Disney+',
      'Hulu',
      'Apple TV+',
      'HBO Max',
      'Paramount+',
      'Peacock',
    ] as const,
  },
];

export default function Import() {
  return (
    <CsvImporter
      fields={fields}
      onImport={(data) => console.log('onImport:', { data })}
    />
  );
}
