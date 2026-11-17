import NewToYouTag from '../../_components/blocks/NewToYouTag';

/**
 * "New to you" after the show's name (once per show); the
 * sparkle alone on a phone, where the row leaves the words no room
 */
export function RowNewTag() {
  return (
    <NewToYouTag
      className="h-6 gap-[5px] bg-[rgb(26_40_20/0.85)] px-2 text-[11px] font-semibold shadow-[inset_0_0_0_1px_rgb(143_220_90/0.35)]"
      textClassName="max-md:hidden"
      variant="inline"
    />
  );
}
