export type JellyfinMetadata = unknown;

export type PlexMetadata = Readonly<{
  librarySectionType: string;
  ratingKey: string;
  key: string;
  parentRatingKey: string;
  grandparentRatingKey: string;
  guid: string;
  Guid?: ReadonlyArray<{ id: string }>;
  librarySectionID: number;
  type: string;
  title: string;
  grandparentKey: string;
  parentKey: string;
  grandparentTitle: string;
  parentTitle: string;
  summary?: string;
  index: number;
  parentIndex: number;
  ratingCount?: number;
  thumb?: string;
  art?: string;
  parentThumb?: string;
  grandparentThumb?: string;
  grandparentArt?: string;
  addedAt: number;
  updatedAt: number;
  year?: number;
}>;

export type ScrobbleMetadata =
  | { plex: PlexMetadata; jellyfin?: never }
  | { plex?: never; jellyfin: JellyfinMetadata };

export type ScrobbleEvent = Readonly<{
  userId: string;
  metadata: ScrobbleMetadata;
}>;
