import { MAP_DOTS, MAP_HEIGHT, MAP_WIDTH } from './worldMap';

const VIEW_BOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;

/**
 * The board's dot grid (HMFinal `e2-map svg`, white at 20%): one static
 * path, rendered on the server, scaled with the map.
 */
export default function DottedMap() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 size-full"
      fill="none"
      viewBox={VIEW_BOX}
    >
      <path
        d={MAP_DOTS}
        stroke="rgb(255 255 255 / 0.2)"
        strokeDasharray="0 6"
        strokeLinecap="round"
        strokeWidth={3}
      />
    </svg>
  );
}
