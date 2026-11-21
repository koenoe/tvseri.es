/**
 * Continue watching after this tab's marks: how many shows are still in
 * progress and whether the In progress lane draws. The server sends the
 * count of every show but draws at most eight; the shows that left the drawn
 * list (caught up, hidden) leave the count too. The lane stays while another
 * show is in progress, even when none of them is drawn here any more.
 */
export default function liveContinue(
  /** every show in progress at load */
  serverCount: number,
  /** the shows the server drew */
  serverDrawn: number,
  /** the drawn shows still in progress */
  liveDrawn: number,
): Readonly<{ count: number; hasLane: boolean }> {
  const count = serverCount - (serverDrawn - liveDrawn);
  return { count, hasLane: count > 1 };
}
