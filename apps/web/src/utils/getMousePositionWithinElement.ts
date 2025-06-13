const getMousePositionWithinElement = (
  event: MouseEvent | TouchEvent,
  element?: Element | null,
) => {
  const targetElement = (element ?? event.currentTarget) as Element;
  const boundingRect = targetElement.getBoundingClientRect();
  const isTouchEvent = 'TouchEvent' in window && event instanceof TouchEvent;

  const xCoordinateWithinBlock = isTouchEvent
    ? event.touches[0]!.clientX - boundingRect.left
    : (event as MouseEvent).clientX - boundingRect.left;
  const yCoordinateWithinBlock = isTouchEvent
    ? event.touches[0]!.clientY - boundingRect.top
    : (event as MouseEvent).clientY - boundingRect.top;

  const width = boundingRect.width;
  const height = boundingRect.height;

  const normalizedX = Math.min(
    1,
    Math.max(0, xCoordinateWithinBlock / width || 0),
  );
  const normalizedY = Math.min(
    1,
    Math.max(0, yCoordinateWithinBlock / height || 0),
  );

  return { x: normalizedX, y: normalizedY };
};

export default getMousePositionWithinElement;
