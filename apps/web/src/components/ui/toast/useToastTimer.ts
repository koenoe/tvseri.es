import {
  type FocusEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { toast } from 'sonner';

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
};
const isHidden = () => document.visibilityState === 'hidden';
const neverHidden = () => false;

/**
 * Closes the toast after `duration`, paused while it is hovered, has focus
 * or the tab is hidden (sonner's own timer doesn't pause on focus). A new
 * `version` (an update with the same id) starts the time over. Returns the
 * handlers for the toast's root element.
 */
export default function useToastTimer({
  duration,
  toastId,
  version,
}: Readonly<{ duration: number; toastId: number | string; version: number }>) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    isHidden,
    neverHidden,
  );
  const paused = hovered || focused || hidden;
  const remaining = useRef(duration);
  const lastVersion = useRef(version);

  // A timer is the one thing here that has to live outside React.
  useEffect(() => {
    if (lastVersion.current !== version) {
      lastVersion.current = version;
      remaining.current = duration;
    }
    if (paused) {
      return;
    }
    const startedAt = Date.now();
    const timer = setTimeout(() => toast.dismiss(toastId), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [duration, paused, toastId, version]);

  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocused(false);
    }
  }, []);
  const onFocus = useCallback(() => setFocused(true), []);
  const onPointerEnter = useCallback(() => setHovered(true), []);
  const onPointerLeave = useCallback(() => setHovered(false), []);

  return { onBlur, onFocus, onPointerEnter, onPointerLeave };
}
