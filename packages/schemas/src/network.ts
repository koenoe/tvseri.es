export type Network = Readonly<{
  id: number;
  name: string;
  /** Landing slug (`/network/{slug}`); null for a network without a landing */
  slug: string | null;
  /** w500 logo URL (the web makes it white unless it has a colour) */
  logo: string | null;
  /**
   * Whether the logo reads as a white silhouette. False (a filled block): the
   * web draws it in its own colours on a light chip. Absent without a logo
   * or when the check failed: drawn white, as for true
   */
  logoSilhouette?: boolean;
  originCountry: Readonly<{ code: string; name: string }> | null;
  homepage: string | null;
  /** One hand-written line (see `NETWORKS` in constants); null when none */
  description: string | null;
}>;
