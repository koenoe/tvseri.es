'use client';

import { memo, type ReactNode, useCallback, useState } from 'react';

import { AnimatePresence } from 'framer-motion';
import { DayFlag, DayPicker, SelectionState, UI } from 'react-day-picker';

import getMousePosition from '@/utils/getMousePosition';

import DropdownContainer, {
  type Position,
} from '../Dropdown/DropdownContainer';

import 'react-day-picker/style.css';

function DatePicker({
  className,
  children,
  offset = { x: 0, y: 0 },
  onSelect,
  onClick,
}: Readonly<{
  className?: string;
  children: ReactNode;
  offset?: Position;
  onSelect: (value: Date | undefined) => void;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}>) {
  const [position, setPosition] = useState<Position | null>(null);
  const [selected, setSelected] = useState<Date>();

  const handleSelect = useCallback(
    (value: Date | undefined) => {
      setSelected(value);
      onSelect(value);
    },
    [onSelect],
  );

  return (
    <>
      <button
        className={className}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          const { x, y } = getMousePosition(event);
          setPosition((prevPosition) =>
            prevPosition ? null : { x: x + offset.x, y: y + offset.y },
          );
          onClick?.(event);
        }}
      >
        {children}
      </button>
      <AnimatePresence>
        {position && (
          <DropdownContainer
            key="dropdown-datepicker"
            position={position}
            onOutsideClick={(event: React.MouseEvent<HTMLDivElement>) => {
              event.stopPropagation();
              setPosition(null);
            }}
          >
            <DayPicker
              selected={selected}
              onSelect={handleSelect}
              showOutsideDays
              disabled={{ after: new Date() }}
              className="rounded-md border border-neutral-600 bg-neutral-900 p-3 shadow-lg"
              mode="single"
              // footer={<div>hallo pik</div>}
              classNames={{
                [UI.Months]: 'relative',
                [UI.Month]: 'space-y-4 ml-0',
                [UI.Nav]: 'relative w-full',
                [UI.MonthCaption]: 'flex justify-center items-center h-7',
                [UI.CaptionLabel]: 'text-sm font-medium',
                [UI.PreviousMonthButton]:
                  'absolute left-1 top-0 size-7 bg-transparent p-0 opacity-30 hover:opacity-60 flex items-center justify-center border border-white rounded',
                [UI.NextMonthButton]:
                  'absolute right-1 top-0 size-7 bg-transparent p-0 opacity-30 hover:opacity-60 flex items-center justify-center border border-white rounded',
                [UI.MonthGrid]: 'w-full border-collapse space-y-1',
                [UI.Weekdays]: 'flex',
                [UI.Weekday]:
                  'rounded-md w-9 font-normal text-[0.8rem] text-neutral-400',
                [UI.Week]: 'flex w-full mt-2',
                [UI.Day]:
                  'size-9 text-center rounded-md text-sm p-0 relative hover:bg-neutral-700 hover:aria-selected:bg-white',
                [UI.DayButton]: 'size-9 font-normal p-0 focus:outline-none',
                [UI.Chevron]: 'size-4 fill-white',
                [SelectionState.selected]:
                  'bg-white text-neutral-900 hover:bg-white hover:text-neutral-900 focus:bg-white focus:text-neutral-900',
                [DayFlag.today]:
                  'bg-neutral-600 text-white hover:bg-neutral-600 aria-selected:bg-white aria-selected:text-neutral-900',
                [DayFlag.outside]: 'opacity-40',
                [DayFlag.disabled]:
                  '!opacity-15 hover:bg-transparent hover:text-white',
                [DayFlag.hidden]: 'invisible',
              }}
            />
          </DropdownContainer>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(DatePicker);
