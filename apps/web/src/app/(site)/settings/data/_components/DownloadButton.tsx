'use client';

import { useTransition } from 'react';

import Button from '@/components/ui/button/Button';
import { downloadGlyph } from '@/components/ui/icon/glyphs';
import { showToast } from '@/components/ui/toast/showToast';

import { MD_BUTTON } from '../../_lib/appButtons';

import {
  attachmentName,
  csvRowCount,
  downloadErrorText,
  downloadedToast,
} from '../_lib/download';

const FILES = {
  everything: {
    fallback: 'tvseries-everything.json',
    path: '/api/me/export/everything.json',
  },
  history: {
    fallback: 'tvseries-history.csv',
    path: '/api/me/export/history.csv',
  },
} as const;

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Download: asks the route handler for the file (the browser can't hold the
 * API key), saves it under the API's attachment name and says so in a toast.
 * The CSV's toast counts its rows, so it is always the file's own number.
 */
export default function DownloadButton({
  file,
  label,
}: Readonly<{ file: keyof typeof FILES; label: string }>) {
  const [pending, startTransition] = useTransition();
  const { fallback, path } = FILES[file];

  const download = () =>
    startTransition(async () => {
      try {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) {
          showToast({
            title: downloadErrorText(response.status),
            tone: 'error',
          });
          return;
        }
        const blob = await response.blob();
        const name = attachmentName(
          response.headers.get('content-disposition'),
          fallback,
        );
        save(blob, name);
        const episodes =
          file === 'history' ? csvRowCount(await blob.text()) : undefined;
        showToast({ title: downloadedToast(name, episodes) });
      } catch {
        showToast({ title: downloadErrorText(0), tone: 'error' });
      }
    });

  return (
    <Button
      aria-label={label}
      className={MD_BUTTON}
      icon={downloadGlyph}
      onClick={download}
      pending={pending}
      variant="tonal"
    >
      Download
    </Button>
  );
}
