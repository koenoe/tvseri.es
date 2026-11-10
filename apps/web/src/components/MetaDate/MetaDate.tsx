/** `MetaYearScript` hides `${META_YEAR_CLASS_PREFIX}${currentYear}` */
export const META_YEAR_CLASS_PREFIX = 'meta-year-';

/**
 * A meta row date from `formatMetaDateParts`: "Nov 8" followed by the year
 * suffix (", 2026"). The year is always rendered, so server and client markup
 * match and nothing reads the clock during render; `MetaYearScript` hides the
 * current year's suffix before the first paint, leaving "Nov 8" this year and
 * "Feb 27, 2024" in any other. For an instant, use `MetaInstant`.
 */
export default function MetaDate({
  monthDay,
  year,
}: Readonly<{
  monthDay: string;
  year: number;
}>) {
  const yearClassName = `${META_YEAR_CLASS_PREFIX}${year}`;

  return (
    <>
      {monthDay}
      <span className={yearClassName}>, {year}</span>
    </>
  );
}
