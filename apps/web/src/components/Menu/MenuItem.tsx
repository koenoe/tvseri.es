import Link, { type LinkProps } from 'next/link';

const MenuItem = ({
  onClick,
  href,
  label,
}: LinkProps &
  Readonly<{
    label: string;
  }>) => {
  return (
    <Link
      className="relative flex h-full w-full items-center overflow-hidden text-3xl lowercase leading-tight text-white md:justify-end md:text-base md:leading-none"
      href={href}
      onClick={onClick}
    >
      <span className="relative h-full truncate text-ellipsis">{label}</span>
    </Link>
  );
};

export default MenuItem;
