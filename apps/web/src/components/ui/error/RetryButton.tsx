import Button from '@/components/ui/button/Button';
import { refreshGlyph } from '@/components/ui/icon/glyphs';

/**
 * “Try again” on an error page: the solid button. While
 * the retry runs it shows the pending ring. Give it the click from a client
 * component (an error boundary's `retry`, or `RefreshButton`).
 */
export default function RetryButton({
  onClick,
  pending = false,
}: Readonly<{ onClick: () => void; pending?: boolean }>) {
  return (
    <Button
      icon={refreshGlyph}
      onClick={onClick}
      pending={pending}
      variant="primary"
    >
      Try again
    </Button>
  );
}
