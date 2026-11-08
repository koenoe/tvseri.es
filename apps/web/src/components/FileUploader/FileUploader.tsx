'use client';

import { cx } from 'class-variance-authority';
import { useCallback, useState } from 'react';
import Dropzone, {
  type DropzoneProps,
  type FileRejection,
} from 'react-dropzone';
import { toast } from 'sonner';

import { CloseAltIcon } from '@/components/Icons/CloseAltIcon';
import { FileIcon } from '@/components/Icons/FileIcon';
import { UploadIcon } from '@/components/Icons/UploadIcon';
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

  const onRemove = useCallback(
    (index: number) => {
      if (!files) return;
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
    },
    [files],
  );

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
              <UploadIcon
                className={cx('mb-4 size-8 text-white/60', {
                  '!text-white': isDragActive,
                })}
              />
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
                index={index}
                key={index}
                onRemove={onRemove}
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
  index,
  onRemove,
}: Readonly<{
  file: File;
  index: number;
  onRemove: (index: number) => void;
}>) {
  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  return (
    <div className="relative flex items-center gap-4">
      <div className="flex flex-1 gap-4">
        <FileIcon className="size-10" />
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
        onClick={handleRemove}
        type="button"
      >
        <CloseAltIcon />
      </button>
    </div>
  );
}
