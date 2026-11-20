/**
 * An element's text as a screen reader reads it: what is `aria-hidden`
 * (a rolling count's drawn digits) is left out
 */
const spoken = (element: Element) => {
  const copy = element.cloneNode(true) as Element;
  for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) {
    hidden.remove();
  }
  return copy.textContent;
};

/**
 * A Testing Library text matcher for the innermost element that reads
 * `text` (a line with a rolling count in it)
 *
 * @example
 * screen.getByText(spokenLine('6 followers · 8 following'))
 */
export const spokenLine =
  (text: string) => (_: string, element: Element | null) =>
    element !== null &&
    spoken(element) === text &&
    !Array.from(element.children).some((child) => spoken(child) === text);
