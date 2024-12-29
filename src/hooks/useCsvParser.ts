import { useState } from 'react';

import * as Papa from 'papaparse';

interface CsvState {
  fileName: string;
  data: {
    parsed: Record<string, unknown>[];
    mapped: Record<string, unknown>[];
  };
  fieldMappings: {
    original: Record<string, string | undefined>;
    current: Record<string, string | undefined>;
  };
  error: string | null;
}

interface UseCsvParserProps extends Papa.ParseConfig {
  fields: { label: string; value: string }[];
  onSuccess?: (data: Record<string, unknown>[]) => void;
  onError?: (message: string) => void;
}

export default function useCsvParser({
  fields,
  onSuccess,
  onError,
  ...props
}: UseCsvParserProps) {
  const [csvState, setCsvState] = useState<CsvState>({
    fileName: '',
    data: {
      parsed: [],
      mapped: [],
    },
    fieldMappings: {
      current: {},
      original: {},
    },
    error: null,
  });

  function onParse({ file, limit = Infinity }: { file: File; limit?: number }) {
    let count = 0;
    const allResults: Record<string, unknown>[] = [];

    Papa.parse<Record<string, unknown>>(file, {
      ...props,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      beforeFirstChunk: (chunk) => {
        const parsedChunk = Papa.parse<string[]>(chunk, {
          header: false,
          skipEmptyLines: true,
        });

        const rows = parsedChunk.data;
        const columns = rows[0] ?? [];

        const newColumns = columns
          .map((column, index) => {
            if (column.trim() === '') {
              const hasNonEmptyValue = rows
                .slice(1)
                .some(
                  (row) =>
                    row[index] !== '' &&
                    row[index] !== null &&
                    row[index] !== undefined,
                );
              if (!hasNonEmptyValue) {
                return null;
              }
            }
            return column.trim() === '' ? `Field ${index + 1}` : column;
          })
          .filter((column) => column !== null);

        rows[0] = newColumns;
        return Papa.unparse(rows);
      },
      step: (results, parser) => {
        try {
          if (count === 0) {
            const mappings = (results.meta.fields ?? [])?.reduce(
              (acc, field) => ({
                ...acc,
                [field]: field,
              }),
              {},
            );

            setCsvState((prevState) => ({
              ...prevState,
              fieldMappings: {
                original: mappings,
                current: mappings,
              },
            }));
          }

          if (count < limit) {
            allResults.push(results.data);
            count++;
          } else {
            parser.abort();
            throw new Error(`Only ${limit} rows are allowed`);
          }
        } catch (err) {
          const error = (err as Error).toString();
          setCsvState((prevState) => ({
            ...prevState,
            error,
          }));
          onError?.(error);
        }
      },
      complete: (_, localFile: File) => {
        setCsvState((prevState) => ({
          ...prevState,
          fileName: localFile?.name
            ? localFile.name.replace(/\.[^/.]+$/, '')
            : 'Untitled',
          data: {
            parsed: allResults,
            mapped: allResults,
          },
        }));
        onSuccess?.(allResults);
      },
    });
  }

  function onFieldChange({
    oldValue,
    newValue,
  }: {
    oldValue: string;
    newValue: string;
  }) {
    setCsvState((prevState) => ({
      ...prevState,
      fieldMappings: {
        ...prevState.fieldMappings,
        current: { ...prevState.fieldMappings.current, [newValue]: oldValue },
      },
      data: {
        ...prevState.data,
        mapped: prevState.data.mapped.map((row, index) => ({
          ...row,
          [newValue]: prevState.data.parsed[index]?.[oldValue],
        })),
      },
    }));
  }

  function onFieldsReset() {
    setCsvState((prevState) => ({
      ...prevState,
      fieldMappings: {
        ...prevState.fieldMappings,
        current: prevState.fieldMappings.original,
      },
      data: {
        ...prevState.data,
        mapped: prevState.data.parsed,
      },
    }));
  }

  function getSanitizedData({ data }: { data: Record<string, unknown>[] }) {
    return data.map((row) =>
      Object.keys(row).reduce(
        (acc, key) => ({
          ...acc,
          [key]: row[key] === null ? '' : row[key],
        }),
        {},
      ),
    );
  }

  return {
    fileName: csvState.fileName,
    data: csvState.data.mapped,
    fieldMappings: csvState.fieldMappings,
    error: csvState.error,
    getSanitizedData,
    onParse,
    onFieldChange,
    onFieldsReset,
  };
}
