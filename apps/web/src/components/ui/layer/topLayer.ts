/**
 * The open modal dialogs, oldest first. A modal `<dialog>` paints over the
 * rest of the page and makes it inert, so anything that must stay on top and
 * usable (the toast) moves into the topmost one.
 */
const layers: HTMLElement[] = [];
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

export function pushLayer(element: HTMLElement) {
  layers.push(element);
  notify();
}

export function popLayer(element: HTMLElement) {
  const index = layers.lastIndexOf(element);
  if (index !== -1) {
    layers.splice(index, 1);
    notify();
  }
}

export function getTopLayer(): HTMLElement | null {
  return layers.at(-1) ?? null;
}

export function subscribeLayers(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
