const getMousePosition = (
  event: React.TouchEvent<Element> | React.MouseEvent<Element>,
) => {
  let x = 0;
  let y = 0;
  let target = null;

  const isTouchEvent = 'TouchEvent' in window && event instanceof TouchEvent;

  if (isTouchEvent) {
    x = (event as React.TouchEvent).touches[0].clientX;
    y = (event as React.TouchEvent).touches[0].clientY;
    target = (event as React.TouchEvent).touches[0].target;
  } else {
    x = (event as React.MouseEvent)?.clientX;
    y = (event as React.MouseEvent)?.clientY;
    target = event?.currentTarget;
  }

  if (event?.type === 'contextmenu' && event?.currentTarget) {
    return {
      x,
      y,
    };
  }

  if (target) {
    const { left, top } = (target as Element).getBoundingClientRect();
    x = left;
    y = top;
  }

  // Fallback to mouse/touch position
  return {
    x,
    y,
  };
};

export default getMousePosition;
