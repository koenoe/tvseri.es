/** Plain-text table: pads every column to its widest cell. */
export const table = (
  header: readonly string[],
  rows: readonly (readonly string[])[],
): string => {
  const widths = header.map((cell, index) =>
    Math.max(cell.length, ...rows.map((row) => (row[index] ?? '').length)),
  );
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, index) => cell.padEnd(widths[index] ?? 0))
      .join('  ')
      .trimEnd();
  return [line(header), ...rows.map(line)].join('\n');
};

/** 75 → "1m15s", 3700 → "1h01m". */
export const duration = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600)
    return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
};

export const since = (iso: string, now = Date.now()): string =>
  duration((now - Date.parse(iso)) / 1000);

export const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;
