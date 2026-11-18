import {
  downloadGlyph,
  plugGlyph,
  shieldGlyph,
  streamingGlyph,
  userGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';

export type SettingsSectionId =
  | 'profile'
  | 'services'
  | 'import'
  | 'plex'
  | 'data';

export type SettingsSection = Readonly<{
  id: SettingsSectionId;
  href: string;
  label: string;
  glyph: Glyph;
}>;

/** The five rows of the sidebar and the phone's list, in order. */
export const SETTINGS_SECTIONS: ReadonlyArray<SettingsSection> = [
  {
    glyph: userGlyph,
    href: '/settings/profile',
    id: 'profile',
    label: 'Profile',
  },
  {
    glyph: streamingGlyph,
    href: '/settings/streaming-services',
    id: 'services',
    label: 'Streaming services',
  },
  {
    glyph: downloadGlyph,
    href: '/settings/import',
    id: 'import',
    label: 'Import',
  },
  {
    glyph: plugGlyph,
    href: '/settings/plex',
    id: 'plex',
    label: 'Connected apps',
  },
  {
    glyph: shieldGlyph,
    href: '/settings/data',
    id: 'data',
    label: 'Your data',
  },
];

export const SETTINGS_INDEX = '/settings';

/** The section `/settings` shows beside the sidebar from lg */
export const FIRST_SECTION = SETTINGS_SECTIONS[0]?.href ?? '/settings/profile';
