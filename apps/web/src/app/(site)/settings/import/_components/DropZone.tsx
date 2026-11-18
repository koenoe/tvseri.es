'use client';

import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';

import cn from '@/lib/cn';

import { preloadCsvReader } from '../_lib/readCsv';
import DropZoneFace, { DROP_ZONE_FRAME } from './DropZoneFace';

const ACCEPT = '.csv,text/csv';

/**
 * The drop zone: a button over a native file input (click, Enter, Space)
 * that also takes a dropped file. One file; the checks (CSV, 4 MB) happen in
 * `onFiles`, and a rejection is a toast. Reading starts at once, so the Check
 * step follows the drop with nothing in between.
 */
export default function DropZone({
  busy,
  onFiles,
  posters,
}: Readonly<{
  busy: boolean;
  onFiles: (files: ReadonlyArray<File>) => void;
  posters: ReadonlyArray<string>;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  const open = () => inputRef.current?.click();
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    // The same file can be chosen again after "Another file"
    event.target.value = '';
    if (files.length > 0) {
      onFiles(files);
    }
  };
  const onDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (!isOver) {
      setIsOver(true);
    }
  };
  const onDragLeave = () => setIsOver(false);
  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsOver(false);
    onFiles([...event.dataTransfer.files]);
  };

  const classes = cn(
    DROP_ZONE_FRAME,
    'cursor-pointer transition-shadow duration-150 hover:shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.5)] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2',
    isOver && 'shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.5)]',
  );
  const reading = busy || undefined;

  return (
    <>
      <button
        aria-busy={reading}
        className={classes}
        onClick={open}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onFocus={preloadCsvReader}
        onPointerEnter={preloadCsvReader}
        type="button"
      >
        <DropZoneFace posters={posters} />
      </button>
      <input
        accept={ACCEPT}
        aria-hidden="true"
        className="sr-only"
        onChange={onChange}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
    </>
  );
}
