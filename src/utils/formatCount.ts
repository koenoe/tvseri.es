export default function formatVoteCount(voteCount: number): string {
  if (voteCount < 1000) {
    return voteCount.toString();
  }

  const units = ['K', 'M', 'B', 'T'];
  let unitIndex = -1;
  let roundedVoteCount = voteCount;

  while (roundedVoteCount >= 1000 && unitIndex < units.length - 1) {
    roundedVoteCount /= 1000;
    unitIndex++;
  }

  return roundedVoteCount.toFixed(1).replace(/\.0$/, '') + units[unitIndex];
}
