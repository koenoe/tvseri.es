export default function getHistoryKey(): string {
  if (typeof window !== 'undefined' && window.history.state?.key) {
    return String(window.history.state.key);
  }
  return 'index';
}
