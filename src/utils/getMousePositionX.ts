const getMousePositionX = (
  event: MouseEvent | TouchEvent,
  element?: Element | null,
) => {
  const targetElement = (element ?? event.currentTarget) as Element;
  const boundingRect = targetElement.getBoundingClientRect();
  const isTouchEvent = 'TouchEvent' in window && event instanceof TouchEvent;
  const xCoordinateWithinBlock = isTouchEvent
    ? event.touches[0].clientX - boundingRect.left
    : (event as MouseEvent).clientX - boundingRect.left;
  const width = boundingRect.width;
  const normalizedValue = xCoordinateWithinBlock / width || 0;

  return Math.min(1, Math.max(0, normalizedValue));
};

export default getMousePositionX;
