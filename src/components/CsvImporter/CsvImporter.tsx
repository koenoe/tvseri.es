'use client';

import { useCallback, useState } from 'react';

import useCsvParser from '@/hooks/useCsvParser';

import FileUploader from '../FileUploader/FileUploader';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../Table';
import PreviewTableHead from './PreviewTableHead';

const fields = [
  { label: 'Title', value: 'title' },
  { label: 'Date', value: 'date' },
  { label: 'Season', value: 'season' },
  { label: 'Episode', value: 'episode' },
  // { label: 'Streaming service', value: 'watchProvider' },
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
      <Table className="text-xs">
        <TableHeader>
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
