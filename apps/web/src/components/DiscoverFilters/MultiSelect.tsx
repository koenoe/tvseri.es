'use client';

import { cx } from 'class-variance-authority';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { CrossIcon } from '@/components/Icons/CrossIcon';
import { SpinnerIcon } from '@/components/Icons/SpinnerIcon';
import isEqualArray from '@/utils/isEqualArray';

import type { Position } from '../Dropdown/DropdownContainer';

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
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
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

const preventMouseDown = (event: React.MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

function SelectedChip({
  onToggle,
  result,
}: Readonly<{
  onToggle: (result: Result) => void;
  result: Result;
}>) {
  const handleClick = useCallback(() => {
    onToggle(result);
  }, [onToggle, result]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter') {
        onToggle(result);
      }
    },
    [onToggle, result],
  );

  return (
    <button
      className="flex items-center justify-center gap-1 text-nowrap rounded-3xl bg-white/10 px-3 py-2 text-xs leading-none tracking-wide text-white"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseDown={preventMouseDown}
    >
      <span>{result.label}</span>
      <CrossIcon className="h-3 w-3" />
    </button>
  );
}

function ResultOption({
  onSelect,
  renderSelectItem,
  result,
}: Readonly<{
  onSelect: (result: Result) => void;
  renderSelectItem: (item: Result) => React.ReactNode;
  result: Result;
}>) {
  const handleClick = useCallback(() => {
    onSelect(result);
  }, [onSelect, result]);

  return (
    <div
      className="relative cursor-pointer"
      onClick={handleClick}
      onMouseDown={preventMouseDown}
    >
      {renderSelectItem(result)}
    </div>
  );
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
        results,
        searchParamKey,
        searchParamSeparator,
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

  const handleResultSelect = useCallback(
    (result: Result) => {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      setInputValue('');
      toggleSelect(result);
    },
    [toggleSelect],
  );

  const handleKeyDown = useDebouncedCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          if (inputValue === '' && selectedResults.length > 0) {
            toggleSelect(selectedResults[selectedResults.length - 1]!);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: yeah whatever
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
  }, [selectedResults]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: yeah whatever
  useEffect(() => {
    reposition({ forceOpen: false });
  }, [selectedResults]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <>
      <div
        className={cx(
          'text-nowrap rounded-3xl bg-white/10 p-5 text-sm leading-none tracking-wide text-white',
          className,
        )}
        onKeyDown={handleKeyDown}
        ref={inputContainerRef}
      >
        <div className="flex flex-wrap gap-2">
          {selectedResults.map((result) => (
            <SelectedChip
              key={result.value}
              onToggle={toggleSelect}
              result={result}
            />
          ))}
          <input
            autoComplete="off"
            autoCorrect="off"
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-xs placeholder:text-white/50"
            data-1p-ignore
            defaultValue={inputValue}
            onBlur={handleClose}
            onChange={handleChange}
            onFocus={handleOpen}
            placeholder={placeholder}
            ref={inputRef}
            spellCheck="false"
            type="text"
          />
          {isPending ? (
            <SpinnerIcon className="inline h-4 w-4 animate-spin fill-white text-neutral-700" />
          ) : null}
        </div>
      </div>
      <AnimatePresence>
        {position && filteredResults.length > 0 && (
          <motion.div
            animate="visible"
            className="absolute shadow-lg"
            exit="hidden"
            initial="hidden"
            key="dropdown"
            style={{
              left: position.x,
              top: position.y,
            }}
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
                  <ResultOption
                    key={result.value}
                    onSelect={handleResultSelect}
                    renderSelectItem={renderSelectItem}
                    result={result}
                  />
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
