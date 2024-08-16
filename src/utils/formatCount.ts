export default function formatVoteCount(voteCount: number): string {
  if (voteCount < 1000) {
    return voteCount.toString();
  }

  const units = ['K', 'M', 'B', 'T'];

  let unitIndex = -1;
  while (voteCount >= 1000 && unitIndex < units.length - 1) {
    voteCount /= 1000;
    unitIndex++;
  }

  return Math.round(voteCount).toString() + units[unitIndex];
}
