'use client';

import { useCallback, useMemo, useState } from 'react';

import { cx } from 'class-variance-authority';

import useCsvParser, { type Field } from '@/hooks/useCsvParser';

import FileUploader from '../FileUploader/FileUploader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../Table';
import PreviewTableHead from './PreviewTableHead';

export default function CsvImporter({
  fields,
  onImport,
}: Readonly<{
  fields: Field[];
  onImport: (data: Record<string, unknown>[]) => void;
}>) {
  const [file, setFile] = useState<File | null>(null);
  const {
    data,
    error,
    fieldMappings,
    onParse,
    onFieldChange,
    onFieldsReset,
    getSanitizedData,
    fileName,
  } = useCsvParser({ fields });

  const handleUpload = useCallback(
    (files: File[]) => {
      setFile(files[0]);
      onParse({ file: files[0] });
    },
    [onParse],
  );

  const areAllFieldsMapped = useMemo(() => {
    return fields.every((field) => {
      const currentMapping = fieldMappings.current[field.value];
      return currentMapping && currentMapping !== '';
    });
  }, [fields, fieldMappings]);

  if (!file) {
    return (
      <FileUploader
        accept={{ 'text/csv': [] }}
        multiple={false}
        maxSize={4 * 1024 * 1024}
        maxFileCount={1}
        onUpload={handleUpload}
      />
    );
  }

  if (file && !fileName && !error) {
    return (
      <div className="relative w-full animate-pulse">
        <div className="mb-10 flex w-full gap-x-10">
          <div>
            <div className="mb-2 h-7 w-32 bg-white/15" />
            <div className="h-5 w-64 bg-white/5" />
          </div>
          <div className="ml-auto h-11 w-24 rounded-3xl bg-white/5" />
        </div>

        <Table className="h-[calc(100vh-29rem)] text-xs">
          <TableHeader className="sticky top-0 z-10 border-b">
            <TableRow>
              {Array(fields.length)
                .fill(null)
                .map((_, index) => (
                  <TableHead key={index}>
                    <div className="flex items-center gap-x-4">
                      <div className="h-4 w-24 bg-white/10" />
                      <div className="ml-auto h-9 w-48 rounded bg-white/5" />
                    </div>
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(50)
              .fill(null)
              .map((_, rowIndex) => (
                <TableRow key={rowIndex} className="h-9">
                  {Array(5)
                    .fill(null)
                    .map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <div className="h-3 w-full bg-white/5" />
                      </TableCell>
                    ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>

        <div className="mt-10 flex w-full items-center gap-x-4">
          <div className="flex h-7 items-center gap-x-2">
            <div className="h-7 w-16 rounded bg-white/10" />
            <div className="h-4 w-12 bg-white/5" />
          </div>
          <div className="ml-auto flex gap-x-4">
            <div className="h-11 w-24 rounded-3xl bg-white/5" />
            <div className="h-11 w-24 rounded-3xl bg-white/20" />
          </div>
        </div>
      </div>
    );
  }

  return (
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
      <Table className="h-[calc(100vh-29rem)] text-xs">
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
      <div className="mt-10 flex w-full items-center gap-x-4">
        <div className="flex items-baseline text-sm text-white/60">
          <span className="rounded bg-white/10 px-2 py-1 font-medium text-white">
            {data.length.toLocaleString()}
          </span>
          <span className="ml-2">items</span>
        </div>
        <button
          onClick={() => setFile(null)}
          className="ml-auto flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white/5 px-5 text-sm leading-none tracking-wide hover:bg-white/10"
        >
          <span>Back</span>
        </button>
        <button
          onClick={() => onImport(getSanitizedData({ data }))}
          className={cx(
            'flex h-11 min-w-24 cursor-pointer items-center justify-center rounded-3xl bg-white px-5 text-sm leading-none tracking-wide text-neutral-900',
            {
              '!cursor-not-allowed opacity-40': !areAllFieldsMapped,
            },
          )}
          disabled={!areAllFieldsMapped}
        >
          <span>Import</span>
        </button>
      </div>
    </div>
  );
}
