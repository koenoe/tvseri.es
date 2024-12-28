'use client';

import { useCallback, useState } from 'react';

import FileUploader from '../FileUploader/FileUploader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../Table';

const fields = [
  { label: 'Title', value: 'title' },
  { label: 'Date', value: 'date' },
  { label: 'Season', value: 'season' },
  { label: 'Episode', value: 'episode' },
  { label: 'Streaming service', value: 'watchProvider' },
];

const dummyData = [
  {
    id: 1,
    title: 'Stranger Things',
    seasonNumber: 4,
    episodeNumber: 1,
    date: '2024-01-15',
    streamingService: 'Netflix',
  },
  {
    id: 2,
    title: 'The Boys',
    seasonNumber: 3,
    episodeNumber: 8,
    date: '2024-02-20',
    streamingService: 'Prime Video',
  },
  {
    id: 3,
    title: 'House of the Dragon',
    seasonNumber: 2,
    episodeNumber: 3,
    date: '2024-03-10',
    streamingService: 'HBO Max',
  },
  {
    id: 4,
    title: 'Ted Lasso',
    seasonNumber: 3,
    episodeNumber: 12,
    date: '2024-02-15',
    streamingService: 'Apple TV+',
  },
  {
    id: 5,
    title: 'The Mandalorian',
    seasonNumber: 4,
    episodeNumber: 2,
    date: '2024-03-05',
    streamingService: 'Disney+',
  },
  {
    id: 6,
    title: 'Wednesday',
    seasonNumber: 2,
    episodeNumber: 4,
    date: '2024-01-30',
    streamingService: 'Netflix',
  },
  {
    id: 7,
    title: 'The Wheel of Time',
    seasonNumber: 2,
    episodeNumber: 6,
    date: '2024-02-28',
    streamingService: 'Prime Video',
  },
  {
    id: 8,
    title: 'Succession',
    seasonNumber: 4,
    episodeNumber: 10,
    date: '2024-01-20',
    streamingService: 'HBO Max',
  },
  {
    id: 9,
    title: 'For All Mankind',
    seasonNumber: 4,
    episodeNumber: 7,
    date: '2024-03-12',
    streamingService: 'Apple TV+',
  },
  {
    id: 10,
    title: 'Loki',
    seasonNumber: 3,
    episodeNumber: 1,
    date: '2024-02-10',
    streamingService: 'Disney+',
  },
  {
    id: 11,
    title: 'The Crown',
    seasonNumber: 6,
    episodeNumber: 8,
    date: '2024-01-25',
    streamingService: 'Netflix',
  },
  {
    id: 12,
    title: 'The Rings of Power',
    seasonNumber: 2,
    episodeNumber: 5,
    date: '2024-03-08',
    streamingService: 'Prime Video',
  },
  {
    id: 13,
    title: 'The Last of Us',
    seasonNumber: 2,
    episodeNumber: 2,
    date: '2024-02-05',
    streamingService: 'HBO Max',
  },
  {
    id: 14,
    title: 'Severance',
    seasonNumber: 2,
    episodeNumber: 3,
    date: '2024-03-15',
    streamingService: 'Apple TV+',
  },
  {
    id: 15,
    title: 'Ahsoka',
    seasonNumber: 2,
    episodeNumber: 4,
    date: '2024-01-18',
    streamingService: 'Disney+',
  },
  {
    id: 16,
    title: 'Black Mirror',
    seasonNumber: 7,
    episodeNumber: 3,
    date: '2024-02-25',
    streamingService: 'Netflix',
  },
  {
    id: 17,
    title: 'Reacher',
    seasonNumber: 2,
    episodeNumber: 8,
    date: '2024-03-01',
    streamingService: 'Prime Video',
  },
  {
    id: 18,
    title: 'True Detective',
    seasonNumber: 4,
    episodeNumber: 6,
    date: '2024-01-22',
    streamingService: 'HBO Max',
  },
  {
    id: 19,
    title: 'Foundation',
    seasonNumber: 3,
    episodeNumber: 1,
    date: '2024-02-12',
    streamingService: 'Apple TV+',
  },
  {
    id: 20,
    title: 'The Bad Batch',
    seasonNumber: 3,
    episodeNumber: 5,
    date: '2024-03-20',
    streamingService: 'Disney+',
  },
];

export default function CsvImporter() {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = useCallback((files: File[]) => {
    setFile(files[0]);
  }, []);

  return file ? (
    <div className="relative w-full">
      <div className="mb-10 flex w-full">
        <div>
          <h2 className="text-md mb-2 lg:text-lg">Map fields</h2>
          <p className="text-sm text-white/60">
            Map the CSV fields to the corresponding table fields.
          </p>
        </div>
        <div className="ml-auto hidden gap-x-4 md:flex">
          <button
            onClick={() => setFile(null)}
            className="flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white/5 px-5 text-sm leading-none tracking-wide"
          >
            <span>Back</span>
          </button>
          <button
            onClick={() => console.log('Import')}
            className="flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white px-5 text-sm leading-none tracking-wide text-neutral-900"
          >
            <span>Import</span>
          </button>
        </div>
      </div>
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Season</TableHead>
            <TableHead>Episode</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Streaming Service</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dummyData.map((series) => (
            <TableRow key={series.id}>
              <TableCell className="whitespace-nowrap font-medium">
                {series.title}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {series.seasonNumber}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {series.episodeNumber}
              </TableCell>
              <TableCell className="whitespace-nowrap">{series.date}</TableCell>
              <TableCell className="whitespace-nowrap">
                {series.streamingService}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ) : (
    <FileUploader
      accept={{ 'text/csv': [] }}
      multiple={false}
      maxSize={4 * 1024 * 1024}
      maxFileCount={1}
      onUpload={handleUpload}
    />
  );
}
