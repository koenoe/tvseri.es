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
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

import DropdownContainer, {
  type Position,
} from '../Dropdown/DropdownContainer';

export type Result = Readonly<{
  value: string | number;
  label: string;
}>;

function MultiSelect({
  className,
  classNameDropdown,
  placeholder,
  searchParamKey,
  searchParamSeparator = ',',
  results: resultsFromProps = [],
  renderSelectItem,
  fetchResults,
}: Readonly<{
  className?: string;
  classNameDropdown?: string;
  placeholder?: string;
  searchParamKey: string;
  searchParamSeparator?: string;
  results?: Result[];
  renderSelectItem: (item: Result) => React.ReactNode;
  fetchResults?: (
    payload: Readonly<{
      query: string;
      signal: AbortSignal;
    }>,
  ) => Promise<Array<Result>>;
}>) {
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputValue, setInputValue] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [widthOfResults, setWidthOfResults] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Result[]>(resultsFromProps);
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedResults = useMemo(() => {
    const searchParamsValues = searchParams.get(searchParamKey);
    const values = searchParamsValues
      ? searchParamsValues.split(searchParamSeparator)
      : [];
    return values
      .map((value) => results?.find((result) => result.value === value))
      .filter((value) => !!value);
  }, [results, searchParamKey, searchParamSeparator, searchParams]);

  const reposition = useCallback(
    (force = false) => {
      const element = inputContainerRef.current as HTMLDivElement;
      if (!element || (!force && position === null)) {
        return;
      }

      const { left, top } = element.getBoundingClientRect();
      setPosition({
        x: left,
        y: top + element.clientHeight + 20,
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

      if (
        fetchResults &&
        isActive &&
        results.some((r) => r.value === result.value)
      ) {
        setResults((prevResuls) =>
          [...selectedResults, ...prevResuls].filter(
            (selected) => selected.value !== result.value,
          ),
        );
      }

      const params = new URLSearchParams(searchParams.toString());
      if (updatedSelectedResults.length > 0) {
        params.set(
          searchParamKey,
          updatedSelectedResults
            .map((selected) => selected.value)
            .join(searchParamSeparator),
        );
      } else {
        params.delete(searchParamKey);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [
      fetchResults,
      results,
      router,
      searchParamKey,
      searchParamSeparator,
      searchParams,
      selectedResults,
    ],
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
              setResults([...selectedResults, ...results]);
            } else {
              setResults(selectedResults);
            }
          } catch (error) {
            setResults(selectedResults);
          }
        });
      }
    },
    100,
  );

  const handleOpen = useCallback(() => {
    const element = inputContainerRef.current as HTMLDivElement;
    setWidthOfResults(element.clientWidth);
    reposition(true);
  }, [reposition]);

  const handleClose = useCallback(() => {
    setPosition(null);
  }, []);

  useEffect(() => {
    reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResults]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredResults = useMemo(() => {
    let filteredResults =
      selectedResults.length > 0
        ? results.filter(
            (result) =>
              !selectedResults.some(
                (selected) => selected.value === result.value,
              ),
          )
        : results;

    if (fetchResults) {
      filteredResults = filteredResults.filter(
        (result) =>
          !resultsFromProps.some(
            (propResult) =>
              propResult.value === result.value &&
              !selectedResults.some(
                (selected) => selected.value === result.value,
              ),
          ),
      );
    }

    if (inputValue && !fetchResults) {
      return filteredResults.filter((result) =>
        result.label.toLowerCase().includes(inputValue.toLowerCase()),
      );
    }

    return filteredResults;
  }, [fetchResults, inputValue, results, resultsFromProps, selectedResults]);

  return (
    <>
      <div
        ref={inputContainerRef}
        onKeyDown={handleKeyDown}
        className={cx(
          'text-nowrap rounded-3xl bg-white/10 px-5 py-4 text-sm leading-none tracking-wide text-white',
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
        </div>
      </div>
      <AnimatePresence>
        {position && filteredResults.length > 0 && (
          <DropdownContainer
            key="multi-select"
            position={position}
            shouldRenderOverlay={false}
          >
            <motion.div
              className="relative h-auto max-h-40 overflow-y-auto overflow-x-hidden rounded-lg bg-white text-neutral-800 md:max-h-96"
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
          </DropdownContainer>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(MultiSelect);
