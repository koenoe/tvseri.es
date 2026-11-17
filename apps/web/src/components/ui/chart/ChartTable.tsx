import { plural } from '@/lib/format/text';

/**
 * The text alternative of a bar chart: a visually hidden table (label →
 * episodes) that screen readers get instead of the `aria-hidden` bars, so a
 * chart is not dozens of tab stops. Hidden through a wrapper: a table won't
 * shrink to `sr-only`'s 1px, so on the table itself it stays as wide as its
 * rows and can widen the page.
 */
export default function ChartTable({
  caption,
  rows,
}: Readonly<{
  caption: string;
  rows: ReadonlyArray<Readonly<{ episodes: number; label: string }>>;
}>) {
  return (
    <div className="sr-only">
      <table>
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
    </div>
  );
}
