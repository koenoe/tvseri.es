import { TextLine } from '@/components/ui/ghost/ghosts';

/**
 * A status line whose words aren't known yet: the placeholder's, and the
 * service card's own until the browser says whether it can connect, so the
 * server's HTML and the placeholder draw the same line.
 */
export const STATUS_GHOST = <TextLine className="text-meta" width="w-28" />;
