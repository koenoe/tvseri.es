/**
 * A 12px-cornered picture card's 1px inner rim, drawn over the art (the
 * profile's Up next hero, Stats' first and last, biggest night and finished
 * slices). The card is `relative`.
 */
export default function CardRim() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-12 shadow-[inset_0_0_0_1px_rgb(221_238_255/0.08)]"
      data-hairline
    />
  );
}
