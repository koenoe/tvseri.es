import { VERSUS_LABEL } from './layout';

/** A row's label in the middle column. Shared by the card and its placeholder. */
export default function RowLabel({
  label,
  role,
}: Readonly<{ label: string; role?: 'rowheader' }>) {
  return (
    <span className={VERSUS_LABEL} role={role}>
      {label}
    </span>
  );
}
