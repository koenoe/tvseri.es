'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import { cx } from 'class-variance-authority';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

import isEqualArray from '@/utils/isEqualArray';

import { type Position } from '../Dropdown/DropdownContainer';

export type Result = Readonly<{
  value: string | number;
  label: string;
}>;

type Props = Readonly<{
  className?: string;
  classNameDropdown?: string;
  placeholder?: string;
  searchParamKey: string;
  searchParamSeparator?: string;
  results?: Result[];
  selectedResults?: Result[];
  renderSelectItem: (item: Result) => React.ReactNode;
  fetchResults?: (
    payload: Readonly<{
      query: string;
      signal: AbortSignal;
    }>,
  ) => Promise<Array<Result>>;
}>;

const dropdownVariants = {
  visible: {
    opacity: 1,
    y: 0,
  },
  hidden: {
    opacity: 0,
    y: 40,
  },
};

function getInitialSelectedResultsFromParams({
  searchParamKey,
  searchParamSeparator,
  results,
}: Pick<Props, 'searchParamKey' | 'results'> &
  Readonly<{
    searchParamSeparator: string;
  }>) {
  const searchParams = new URLSearchParams(window.location.search);
  const initialIds =
    searchParams.get(searchParamKey)?.split(searchParamSeparator) ?? [];
  const selectedResults =
    results
      ?.filter((result) => initialIds.includes(String(result.value)))
      .filter((result) => !!result) ?? [];

  return selectedResults;
}

function MultiSelect({
  className,
  classNameDropdown,
  placeholder,
  searchParamKey,
  searchParamSeparator = ',',
  results: resultsFromProps = [],
  selectedResults: selectedResultsFromProps,
  renderSelectItem,
  fetchResults,
}: Props) {
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputValue, setInputValue] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [widthOfResults, setWidthOfResults] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Result[]>(resultsFromProps);
  const [selectedResults, setSelectedResults] = useState<Result[]>(
    selectedResultsFromProps ??
      getInitialSelectedResultsFromParams({
        searchParamKey,
        searchParamSeparator,
        results,
      }),
  );
  const router = useRouter();

  const reposition = useCallback(
    ({ forceOpen = false }: Readonly<{ forceOpen?: boolean }>) => {
      const element = inputContainerRef.current!;
      if (!element || (!forceOpen && position === null)) {
        return;
      }

      setPosition({
        x: element.offsetLeft,
        y: element.offsetTop + element.clientHeight + 20,
      });
    },
    [position],
  );

  const toggleSelect = useCallback(
    (result: Result) => {
      const isActive = selectedResults.some(
        (selected) => selected.value === result.value,
      );

      const updatedSelectedResults = isActive
        ? selectedResults.filter((selected) => selected.value !== result.value)
        : [...selectedResults, result];

      setSelectedResults(updatedSelectedResults);
    },
    [selectedResults],
  );

  const handleKeyDown = useDebouncedCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          if (inputValue === '' && selectedResults.length > 0) {
            toggleSelect(selectedResults[selectedResults.length - 1]);
          }
        }
        if (event.key === 'Escape') {
          input.blur();
        }
      }
    },
    100,
  );

  const handleChange = useDebouncedCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      const signal = controller.signal;
      abortControllerRef.current = controller;

      const value = event.target.value;
      setInputValue(value);

      if (fetchResults && value) {
        startTransition(async () => {
          try {
            const results = await fetchResults({
              query: value,
              signal,
            });
            if (results) {
              setResults(results);
            }
          } catch (_error) {}
        });
      }
    },
    100,
  );

  const handleOpen = useCallback(() => {
    const element = inputContainerRef.current!;
    setWidthOfResults(element.clientWidth);
    reposition({ forceOpen: true });
  }, [reposition]);

  const handleClose = useCallback(() => {
    setPosition(null);
  }, []);

  const filteredResults = useMemo(() => {
    const filteredResults =
      selectedResults.length > 0
        ? results.filter(
            (result) =>
              !selectedResults.some(
                (selected) => selected.value === result.value,
              ),
          )
        : results;

    if (inputValue && !fetchResults) {
      return filteredResults.filter((result) =>
        result.label.toLowerCase().includes(inputValue.toLowerCase()),
      );
    }

    return filteredResults;
  }, [fetchResults, inputValue, results, selectedResults]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const valuesFromSelectedResults = selectedResults.map((results) =>
      String(results.value),
    );
    const valuesFromParams =
      params.get(searchParamKey)?.split(searchParamSeparator) ?? [];

    if (isEqualArray(valuesFromSelectedResults, valuesFromParams)) {
      return;
    }

    if (selectedResults.length > 0) {
      params.set(
        searchParamKey,
        selectedResults
          .map((selected) => selected.value)
          .join(searchParamSeparator),
      );
    } else {
      params.delete(searchParamKey);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResults]);

  useEffect(() => {
    reposition({ forceOpen: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResults]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <>
      <div
        ref={inputContainerRef}
        onKeyDown={handleKeyDown}
        className={cx(
          'text-nowrap rounded-3xl bg-white/10 p-5 text-sm leading-none tracking-wide text-white',
          className,
        )}
      >
        <div className="flex flex-wrap gap-2">
          {selectedResults.map((result) => {
            return (
              <button
                key={result.value}
                className="flex items-center justify-center gap-1 text-nowrap rounded-3xl bg-white/10 px-3 py-2 text-xs leading-none tracking-wide text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    toggleSelect(result);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => toggleSelect(result)}
              >
                <span>{result.label}</span>
                <svg
                  viewBox="0 0 15 15"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                >
                  <path
                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            );
          })}
          <input
            ref={inputRef}
            onChange={handleChange}
            onBlur={handleClose}
            onFocus={handleOpen}
            placeholder={placeholder}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-xs placeholder:text-white/50"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            type="text"
            defaultValue={inputValue}
            data-1p-ignore
          />
          {isPending && (
            <svg
              aria-hidden="true"
              className="inline h-4 w-4 animate-spin fill-white text-neutral-700"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
          )}
        </div>
      </div>
      <AnimatePresence>
        {position && filteredResults.length > 0 && (
          <motion.div
            key="dropdown"
            className="absolute shadow-lg"
            style={{
              top: position.y,
              left: position.x,
            }}
            animate="visible"
            initial="hidden"
            exit="hidden"
            variants={dropdownVariants}
          >
            <motion.div
              className="relative h-auto max-h-40 overflow-y-auto overflow-x-hidden rounded-lg bg-white text-neutral-900 md:max-h-96"
              style={{
                width: widthOfResults,
              }}
            >
              <div
                className={cx('relative h-full w-full p-6', classNameDropdown)}
              >
                {filteredResults?.map((result) => (
                  <div
                    className="relative cursor-pointer"
                    key={result.value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => {
                      if (inputRef.current) {
                        inputRef.current.value = '';
                      }
                      setInputValue('');
                      toggleSelect(result);
                    }}
                  >
                    {renderSelectItem(result)}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(MultiSelect);
