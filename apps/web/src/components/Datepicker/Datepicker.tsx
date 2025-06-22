'use client';

import 'react-day-picker/style.css';

import { memo, type ReactNode, useCallback, useRef, useState } from 'react';

import { AnimatePresence } from 'motion/react';
import { DayFlag, DayPicker, SelectionState, UI } from 'react-day-picker';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';
import getMainBackgroundColor from '@/utils/getMainBackgroundColor';

import DropdownContainer, {
  type Position,
} from '../Dropdown/DropdownContainer';

export type Props = Readonly<{
  className?: string;
  children: ReactNode;
  offset?: Position;
  selected?: Date;
  onSelect: (value: string) => void;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  footer?: ReactNode;
}>;

function DatePicker({
  className,
  children,
  selected: selectedFromProps = new Date(),
  onSelect,
  onClick,
  footer,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Date>(selectedFromProps);
  const [backgroundColor, setBackgroundColor] = useState(
    DEFAULT_BACKGROUND_COLOR,
  );

  const handleSelect = useCallback(
    (value: Date | undefined) => {
      const newSelected = value || new Date();
      setSelected(newSelected);
      onSelect(newSelected.toISOString());
    },
    [onSelect],
  );

  return (
    <>
      <button
        ref={triggerRef}
        className={className}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          setBackgroundColor(getMainBackgroundColor());
          setIsOpen((prev) => !prev);
          onClick?.(event);
        }}
      >
        {children}
      </button>
      <AnimatePresence>
        {isOpen && (
          <DropdownContainer
            key="dropdown-datepicker"
            triggerRef={triggerRef}
            position={{ x: 'center', y: 'end' }}
            onOutsideClick={(event: React.MouseEvent<HTMLDivElement>) => {
              event.stopPropagation();
              setIsOpen(false);
            }}
          >
            <DayPicker
              captionLayout="dropdown-years"
              defaultMonth={selected}
              selected={selected}
              onSelect={handleSelect}
              showOutsideDays
              disabled={{ after: new Date() }}
              className="rounded-md border border-white/10 p-3 shadow-lg"
              style={{ backgroundColor }}
              mode="single"
              footer={footer}
              classNames={{
                [UI.Months]: 'relative',
                [UI.Month]: 'space-y-4 ml-0',
                [UI.Nav]: 'relative w-full',
                [UI.MonthCaption]: 'flex justify-center items-center h-7',
                [UI.CaptionLabel]: 'font-normal flex items-center gap-x-1 h-7',
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
                  'size-9 text-center rounded-md text-sm p-0 relative hover:bg-white/10 hover:aria-selected:bg-white',
                [UI.DayButton]: 'size-9 font-normal p-0 focus:outline-none',
                [UI.Chevron]: 'size-4 fill-white',
                [SelectionState.selected]:
                  'bg-white text-neutral-900 hover:bg-white hover:text-neutral-900 focus:bg-white focus:text-neutral-900',
                [DayFlag.today]:
                  'bg-white/20 text-white hover:bg-white/20 aria-selected:bg-white aria-selected:text-neutral-900',
                [DayFlag.outside]: 'opacity-40',
                [DayFlag.disabled]: '!opacity-15 hover:bg-transparent',
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
