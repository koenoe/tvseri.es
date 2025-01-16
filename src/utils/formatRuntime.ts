export default function formatRuntime(
  minutes: number,
  showMinutes = true,
): string {
  if (!showMinutes) {
    // Round to nearest hour before calculating days
    minutes = Math.round(minutes / 60) * 60;
  }

  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (mins > 0 && showMinutes) {
    parts.push(`${mins}m`);
  }

  if (parts.length === 0) {
    return showMinutes ? '0m' : '0h';
  }

  return parts.join(' ');
}
