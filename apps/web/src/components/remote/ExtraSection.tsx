'use client';

import { useEffect, useId } from 'react';

import { shieldGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import KeyButton from './KeyButton';
import KeyRow from './KeyRow';
import type { RemoteSection } from './types';

/**
 * The Admin row: a rule, the shield, the overline title and the note on
 * the right (`.rk-adm`), then its keys in equal columns.
 */
export default function ExtraSection({
  section,
}: Readonly<{ section: RemoteSection }>) {
  const noteId = useId();
  const { onShow } = section;
  useEffect(() => {
    onShow?.();
  }, [onShow]);
  return (
    <>
      <div
        aria-hidden
        className="flex items-center gap-1.5 border-rk-line border-t px-1 pt-2 text-overline text-rk-w64 uppercase"
      >
        <Icon glyph={shieldGlyph} size={13} />
        <span>{section.title}</span>
        {section.note ? (
          <span
            className="ml-auto text-caption normal-case tracking-normal"
            id={noteId}
          >
            {section.note}
          </span>
        ) : null}
      </div>
      {/* the drawn row is decoration; the note reaches screen readers as the group's description */}
      <KeyRow
        describedBy={section.note ? noteId : undefined}
        label={section.title}
      >
        {section.keys.map((key) => (
          <KeyButton key={key.id} {...key} />
        ))}
      </KeyRow>
    </>
  );
}
