import { useCallback, useState } from 'react';

import * as Papa from 'papaparse';

export type Field = Readonly<{
  label: string;
  value: string;
  format?: (value: string) => string | number;
  predefined?: ReadonlyArray<string | number>;
}>;

type CsvState = Readonly<{
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
}>;

type UseCsvParserProps = {
  fields: Field[];
  onSuccess?: (data: Record<string, unknown>[]) => void;
  onError?: (message: string) => void;
} & Papa.ParseConfig;

const formatValue = (
  value: unknown,
  targetField: string,
  fields: Field[],
): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const field = fields.find((f) => f.value === targetField);
  return field?.format ? field.format(value) : value;
};

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

  const onParse = useCallback(
    ({ file, limit = Infinity }: { file: File; limit?: number }) => {
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
            const error = (err as Error)?.message;
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
    },
    [onError, onSuccess, props],
  );

  const onFieldChange = useCallback(
    ({ oldValue, newValue }: { oldValue: string; newValue: string }) => {
      setCsvState((prevState) => ({
        ...prevState,
        fieldMappings: {
          ...prevState.fieldMappings,
          current: { ...prevState.fieldMappings.current, [newValue]: oldValue },
        },
        data: {
          ...prevState.data,
          mapped: prevState.data.mapped.map((row, index) => {
            const field = fields.find((f) => f.value === newValue);
            const isPredefinedValue = field?.predefined?.includes(oldValue);

            const value = isPredefinedValue
              ? oldValue
              : formatValue(
                  prevState.data.parsed[index]?.[oldValue],
                  newValue,
                  fields,
                );

            return {
              ...row,
              [newValue]: value,
            };
          }),
        },
      }));
    },
    [fields],
  );

  const onFieldsReset = useCallback(() => {
    setCsvState((prevState) => ({
      ...prevState,
      fieldMappings: {
        ...prevState.fieldMappings,
        current: Object.fromEntries(
          fields.map((field) => [
            field.value,
            field.predefined
              ? ''
              : prevState.fieldMappings.original[field.value],
          ]),
        ),
      },
      data: {
        ...prevState.data,
        mapped: prevState.data.parsed,
      },
    }));
  }, [fields]);

  const getSanitizedData = useCallback(
    ({ data }: { data: Record<string, unknown>[] }) =>
      data.map((row) =>
        Object.keys(row).reduce(
          (acc, key) => ({
            ...acc,
            [key]: row[key] === null ? '' : row[key],
          }),
          {},
        ),
      ),
    [],
  );

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
