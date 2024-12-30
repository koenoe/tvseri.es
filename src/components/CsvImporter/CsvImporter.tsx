'use client';

import { useCallback, useState } from 'react';

import useCsvParser, { type Field } from '@/hooks/useCsvParser';

import FileUploader from '../FileUploader/FileUploader';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../Table';
import PreviewTableHead from './PreviewTableHead';

const fields: Field[] = [
  {
    label: 'Title',
    value: 'title',
    parser: {
      regex:
        /^(.+?)(?=(?:\s+Season|\s*[-–]\s*Season|:\s*(?:Season|Part|Limited Series|Episode|Chapter)))/i,
      transform: (match, value) => (match ? match[1].trim() : value),
    },
  },
  { label: 'Date', value: 'date' },
  {
    label: 'Season',
    value: 'season',
    parser: {
      regex: /Season (\d+)|Season#(\d+)|Part (\d+)/,
      transform: (match) =>
        match ? parseInt(match[1] || match[2] || match[3], 10) : 1,
    },
  },
  {
    label: 'Episode',
    value: 'episode',
    parser: {
      regex:
        /(?:Episode[# ](\d+)|Chapter[# ](\d+)|Part (?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten))/i,
      transform: (match) => {
        if (!match) return '';
        if (match[1] || match[2]) return parseInt(match[1] || match[2], 10);

        const wordToNumber: Record<string, number> = {
          one: 1,
          two: 2,
          three: 3,
          four: 4,
          five: 5,
          six: 6,
          seven: 7,
          eight: 8,
          nine: 9,
          ten: 10,
        };

        const word = match[0].replace('Part ', '').toLowerCase();
        return wordToNumber[word] || '';
      },
    },
  },
];

export default function CsvImporter() {
  const [file, setFile] = useState<File | null>(null);
  const {
    data,
    fieldMappings,
    onParse,
    onFieldChange,
    onFieldsReset,
    getSanitizedData,
  } = useCsvParser({ fields });

  const handleUpload = useCallback(
    (files: File[]) => {
      setFile(files[0]);
      onParse({ file: files[0], limit: 1001 });
    },
    [onParse],
  );

  return file ? (
    <div className="relative w-full">
      <div className="mb-10 flex w-full gap-x-10">
        <div>
          <h2 className="text-md mb-2 lg:text-lg">Map fields</h2>
          <p className="text-sm leading-relaxed text-white/60">
            Map the CSV fields to the corresponding table fields.
          </p>
        </div>
        <button
          onClick={onFieldsReset}
          className="ml-auto flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white/5 px-5 text-sm leading-none tracking-wide hover:bg-white/10"
        >
          <span>Reset</span>
        </button>
      </div>
      <Table className="h-[calc(100vh-28.25rem)] text-xs">
        <TableHeader className="sticky top-0 z-10 border-b">
          <TableRow>
            {fields.map((field) => (
              <PreviewTableHead
                key={field.value}
                field={field}
                onFieldChange={(f) => {
                  onFieldChange({
                    oldValue: f.value,
                    newValue: field.value,
                  });
                }}
                originalFieldMappings={fieldMappings.original}
                currentFieldMapping={fieldMappings.current[field.value]}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              {fields.map((field) => (
                <TableCell key={field.value}>
                  <span className="block min-h-3 leading-relaxed">
                    {String(row[field.value] ?? '')}
                  </span>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-10 flex w-full gap-x-4">
        <button
          onClick={() => setFile(null)}
          className="ml-auto flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white/5 px-5 text-sm leading-none tracking-wide hover:bg-white/10"
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
