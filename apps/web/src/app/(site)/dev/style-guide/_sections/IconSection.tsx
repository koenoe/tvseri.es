import * as glyphs from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { IconSize } from '@/components/ui/icon/types';

import Section from './Section';

const SIZES: ReadonlyArray<IconSize> = [13, 16, 20, 24];

// Every glyph, so knip.json leaves this file out of the web's project: its
// namespace use would otherwise count every glyph as used by the app
const entries = Object.entries(glyphs).map(([key, glyph]) => ({
  glyph,
  name: key.replace(/Glyph$/, ''),
}));

export default function IconSection() {
  return (
    <Section id="icons" source="the icon set" title="Icons">
      <ul className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map(({ glyph, name }) => (
          <li className="flex items-center gap-3" key={name}>
            {SIZES.map((size) => (
              <Icon glyph={glyph} key={size} size={size} />
            ))}
            {glyph.filled === undefined ? null : (
              <Icon active className="text-cyan" glyph={glyph} size={20} />
            )}
            <span className="truncate text-caption text-white/60">{name}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
