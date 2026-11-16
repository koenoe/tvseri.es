import { plural } from '@/lib/format/text';

/**
 * The text alternative of a bar chart: a visually hidden table (label →
 * episodes) that screen readers get instead of the `aria-hidden` bars, so a
 * chart is not dozens of tab stops.
 */
export default function ChartTable({
  caption,
  rows,
}: Readonly<{
  caption: string;
  rows: ReadonlyArray<Readonly<{ episodes: number; label: string }>>;
}>) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {rows.map(({ episodes, label }) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{plural(episodes, 'episode')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
