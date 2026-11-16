/**
 * One line whenever Home's feature or toy of the day is not the kind the
 * date planned (`featureKindOfDay`, `toyKindOfDay`): which slot, which day,
 * what was planned, what took the slot (null: nothing), and why each kind
 * before it gave way. The web reserves the planned kind's space, so these
 * are the days its placeholder was the wrong size.
 */
export const logFallThrough = (
  slot: 'feature' | 'toy',
  fields: Readonly<{
    date: string;
    planned: string;
    used: string | null;
    why: ReadonlyArray<string>;
  }>,
) => {
  console.warn(
    JSON.stringify({
      level: 'warn',
      message: `Home ${slot}: ${fields.planned} fell through on ${fields.date} to ${fields.used ?? 'nothing'}`,
      slot,
      ...fields,
    }),
  );
};

export const reasonOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
