import { IMPORT_MAX_FILE_BYTES } from './contract';
import type { ParsedFile } from './importState';

/**
 * Reading the dropped file, in the browser (nothing is uploaded). PapaParse
 * loads on demand (`import()`), so it stays out of the page's first load;
 * `preloadCsvReader` warms it when the pointer reaches the drop zone.
 */

export type FileRejection =
  | 'several'
  | 'too-big'
  | 'not-csv'
  | 'empty'
  | 'unreadable';

export const REJECTION_COPY: Readonly<Record<FileRejection, string>> = {
  empty: 'That file has no rows.',
  'not-csv': 'That isn’t a CSV file.',
  several: 'One file at a time, please.',
  'too-big': 'That file is over 4 MB.',
  unreadable: 'Couldn’t read that file.',
};

const loadPapa = () => import('papaparse');

/**
 * Spreadsheet-safe exports (ours too) put an apostrophe before a
 * cell that starts like a formula; one such apostrophe is taken off, so an
 * export imports back as it is.
 */
const FORMULA_GUARD = /^'(?=[=+\-@\t\r])/;

const cellText = (value: string | undefined) => {
  const text = (value ?? '').trim();
  return FORMULA_GUARD.test(text) ? text.slice(1).trim() : text;
};

export const preloadCsvReader = () => {
  void loadPapa();
};

/** The file's own checks, before reading it. */
export function rejectionOf(files: ReadonlyArray<File>): FileRejection | null {
  if (files.length > 1) {
    return 'several';
  }
  const [file] = files;
  if (!file) {
    return 'empty';
  }
  const isCsv =
    /\.csv$/i.test(file.name) ||
    file.type === 'text/csv' ||
    file.type === 'application/vnd.ms-excel';
  if (!isCsv) {
    return 'not-csv';
  }
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return 'too-big';
  }
  return file.size === 0 ? 'empty' : null;
}

/**
 * Unnamed header cells become "Field 3" (columns with values) or are dropped
 * (empty columns).
 */
const nameHeaders = (rows: string[][]): string[] => {
  const header = rows[0] ?? [];
  return header.map((name, index) => {
    const trimmed = name.replace(/^﻿/, '').trim();
    return trimmed === '' ? `Field ${index + 1}` : trimmed;
  });
};

export async function readCsv(file: File): Promise<ParsedFile | FileRejection> {
  const Papa = await loadPapa();
  let text: string;
  try {
    text = await file.text();
  } catch {
    return 'unreadable';
  }
  const grid = Papa.parse<string[]>(text, {
    dynamicTyping: false,
    header: false,
    skipEmptyLines: 'greedy',
  });
  const headers = nameHeaders(grid.data);
  const body = grid.data.slice(1);
  if (headers.length === 0 || body.length === 0) {
    return 'empty';
  }
  const used = headers.map((_, column) =>
    body.some((row) => (row[column] ?? '').trim() !== ''),
  );
  const keep = headers
    .map((name, column) => ({ column, name }))
    .filter(({ column, name }) => used[column] || !name.startsWith('Field '));
  const rows = body.map((row) => {
    const record: Record<string, unknown> = {};
    for (const { column, name } of keep) {
      // Text throughout: "2" in an S column is read as a number later, and a
      // show called "1899" stays a show
      record[name] = cellText(row[column]);
    }
    return record;
  });
  return { headers: keep.map(({ name }) => name), name: file.name, rows };
}
