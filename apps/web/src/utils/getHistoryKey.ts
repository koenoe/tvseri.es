export default function getHistoryKey(): string {
  if (window?.history.state?.key) {
    return String(window.history.state.key);
  }
  return 'index';
}
