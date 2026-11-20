'use client';

import { useTransition } from 'react';

import Button from '@/components/ui/button/Button';
import { linkGlyph } from '@/components/ui/icon/glyphs';
import { showToast } from '@/components/ui/toast/showToast';
import { PRIMARY_BUTTON } from '../../_lib/appButtons';
import { PLEX_ERROR_TEXT } from '../_lib/plexCopy';
import { createPlexUrl } from '../actions';

/** "Create my Plex URL": the first URL, made by the API for the signed-in user. */
export default function CreatePlexUrl() {
  const [pending, startTransition] = useTransition();
  const create = () =>
    startTransition(async () => {
      const result = await createPlexUrl();
      showToast(
        result.ok
          ? {
              title:
                'Created your webhook URL: paste it into Plex. It works within a minute.',
            }
          : { title: PLEX_ERROR_TEXT[result.error], tone: 'error' },
      );
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        className={PRIMARY_BUTTON}
        icon={linkGlyph}
        onClick={create}
        pending={pending}
        variant="primary"
      >
        Create my Plex URL
      </Button>
    </div>
  );
}
