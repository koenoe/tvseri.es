export function CheckSharpIcon({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline
        points="416 128 192 384 96 288"
        style={{
          fill: 'none',
          stroke: 'currentColor',
          strokeLinecap: 'square',
          strokeMiterlimit: 10,
          strokeWidth: '44px',
        }}
      />
    </svg>
  );
}
