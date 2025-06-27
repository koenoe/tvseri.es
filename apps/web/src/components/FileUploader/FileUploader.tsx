'use client';

import { cx } from 'class-variance-authority';
import { useCallback, useState } from 'react';
import Dropzone, {
  type DropzoneProps,
  type FileRejection,
} from 'react-dropzone';
import { toast } from 'sonner';

import formatBytes from '@/utils/formatBytes';

interface FileUploaderProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: File[];
  onUpload?: (files: File[]) => void;
  accept?: DropzoneProps['accept'];
  maxSize?: DropzoneProps['maxSize'];
  maxFileCount?: DropzoneProps['maxFiles'];
  multiple?: boolean;
  disabled?: boolean;
}

export default function FileUploader(props: FileUploaderProps) {
  const {
    value: valueProp,
    onUpload,
    accept = {
      'image/*': [],
    },
    maxSize = 1024 * 1024 * 2,
    maxFileCount = 1,
    multiple = false,
    disabled = false,
    className,
    ...dropzoneProps
  } = props;

  const [files, setFiles] = useState(valueProp);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (!multiple && maxFileCount === 1 && acceptedFiles.length > 1) {
        toast.error('Cannot upload more than 1 file at a time');
        return;
      }

      if ((files?.length ?? 0) + acceptedFiles.length > maxFileCount) {
        toast.error(`Cannot upload more than ${maxFileCount} files`);
        return;
      }

      const updatedFiles = files ? [...files, ...acceptedFiles] : acceptedFiles;

      setFiles(updatedFiles);

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file }) => {
          toast.error(`File ${file.name} was rejected`);
        });
      }

      if (
        onUpload &&
        updatedFiles.length > 0 &&
        updatedFiles.length <= maxFileCount
      ) {
        onUpload(updatedFiles);
      }
    },

    [files, maxFileCount, multiple, onUpload],
  );

  function onRemove(index: number) {
    if (!files) return;
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
  }

  const isDisabled = disabled || (files?.length ?? 0) >= maxFileCount;

  return (
    <div className="relative flex flex-col gap-6 overflow-hidden">
      <Dropzone
        accept={accept}
        disabled={isDisabled}
        maxFiles={maxFileCount}
        maxSize={maxSize}
        multiple={maxFileCount > 1 || multiple}
        onDrop={onDrop}
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...getRootProps()}
            className={cx(
              'relative grid h-52 w-full cursor-pointer place-items-center rounded-xl border-2 border-dashed border-white/40 px-5 py-2.5 text-center transition hover:bg-white/[0.01]',
              {
                '!border-white !bg-transparent !text-white': isDragActive,
                'pointer-events-none opacity-50': isDisabled,
              },
              className,
            )}
            {...dropzoneProps}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center pb-6 pt-5">
              <svg
                className={cx('mb-4 size-8 text-white/60', {
                  '!text-white': isDragActive,
                })}
                fill="none"
                viewBox="0 0 20 16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              <p
                className={cx('mb-2 text-base text-white/60', {
                  '!text-white': isDragActive,
                })}
              >
                <span className="font-bold">Click to upload</span> or drag and
                drop
              </p>
              <p
                className={cx('text-sm text-white/60', {
                  '!text-white': isDragActive,
                })}
              >
                {formatBytes(maxSize)} max file size
              </p>
            </div>
          </div>
        )}
      </Dropzone>
      {files?.length ? (
        <div className="h-fit w-full px-3">
          <div className="flex max-h-48 flex-col gap-4">
            {files?.map((file, index) => (
              <FileCard
                file={file}
                key={index}
                onRemove={() => onRemove(index)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FileCard({
  file,
  onRemove,
}: Readonly<{
  file: File;
  onRemove: () => void;
}>) {
  return (
    <div className="relative flex items-center gap-4">
      <div className="flex flex-1 gap-4">
        <svg
          className="size-10"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 10h12v1H6zM3 1h12.29L21 6.709V23H3zm12 6h5v-.2L15.2 2H15zM4 22h16V8h-6V2H4zm2-7h12v-1H6zm0 4h9v-1H6z" />
          <path d="M0 0h24v24H0z" fill="none" />
        </svg>
        <div className="flex w-full flex-col gap-1">
          <p className="text-foreground/80 line-clamp-1 text-sm font-medium">
            {file.name}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatBytes(file.size)}
          </p>
        </div>
      </div>
      <button
        className="size-8 rounded-md border border-white p-1 text-white"
        onClick={onRemove}
        type="button"
      >
        <svg
          fill="currentColor"
          viewBox="0 0 1024 1024"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M697.4 759.2l61.8-61.8L573.8 512l185.4-185.4-61.8-61.8L512 450.2 326.6 264.8l-61.8 61.8L450.2 512 264.8 697.4l61.8 61.8L512 573.8z" />
        </svg>
      </button>
    </div>
  );
}
