import Logo from './Logo';
import Search from './Search/Search';

export default function Header() {
  return (
    <div className="absolute z-10 h-[6rem] w-screen md:h-[8rem]">
      <div className="container flex h-full w-full items-center justify-between">
        <Logo priority />
        <Search />
      </div>
    </div>
  );
}
