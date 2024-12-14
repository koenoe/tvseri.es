import { cx } from 'class-variance-authority';
import { notFound } from 'next/navigation';

import Page from '@/components/Page/Page';
import { findUser } from '@/lib/db/user';

type Props = Readonly<{
  params: Promise<{ username: string }>;
}>;

const colours = ['#666666', '#00FFFF', '#FF0080']; // darker grey, cyan, magenta

const SvgPattern = ({ className }: Readonly<{ className?: string }>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 480 390"
    className={cx('scale-y-150 md:scale-y-125 lg:scale-y-100', className)}
  >
    <g fill="none" fillRule="evenodd">
      <g transform="translate(447 121)">
        <rect fill={colours[0]} y="55" width="5" height="90"></rect>
        <rect fill={colours[1]} width="5" height="48"></rect>
        <rect fill={colours[2]} y="169" width="5" height="22"></rect>
      </g>
      <g transform="translate(417 111)">
        <rect fill={colours[0]} y="66" width="5" height="80"></rect>
        <rect fill={colours[1]} width="5" height="38"></rect>
        <rect fill={colours[2]} y="152" width="5" height="42"></rect>
      </g>
      <g transform="translate(387 84)">
        <rect fill={colours[0]} y="78" width="5" height="100"></rect>
        <rect fill={colours[2]} y="201" width="5" height="42"></rect>
        <rect fill={colours[1]} width="5" height="70"></rect>
      </g>
      <g transform="translate(357 80)">
        <rect fill={colours[0]} y="96" width="5" height="85"></rect>
        <rect fill={colours[0]} y="68" width="5" height="20"></rect>
        <rect fill={colours[1]} width="5" height="57"></rect>
        <rect fill={colours[2]} y="212" width="5" height="42"></rect>
      </g>
      <g transform="translate(327 96)">
        <rect fill={colours[0]} y="48" width="5" height="80"></rect>
        <rect fill={colours[1]} y="12" width="5" height="28"></rect>
        <rect fill={colours[1]} width="5" height="4"></rect>
        <rect fill={colours[2]} y="144" width="5" height="32"></rect>
      </g>
      <g transform="translate(297 111)">
        <rect fill={colours[0]} y="46" width="5" height="70"></rect>
        <rect fill={colours[0]} y="124" width="5" height="4"></rect>
        <rect fill={colours[1]} width="5" height="38"></rect>
        <rect fill={colours[2]} y="142" width="5" height="32"></rect>
      </g>
      <g transform="translate(267 40)">
        <rect fill={colours[0]} y="102" width="5" height="90"></rect>
        <rect fill={colours[2]} y="210" width="5" height="22"></rect>
        <rect fill={colours[1]} width="5" height="80"></rect>
      </g>
      <g transform="translate(237 86)">
        <rect fill={colours[0]} y="36" width="5" height="90"></rect>
        <rect fill={colours[1]} width="5" height="28"></rect>
        <rect fill={colours[2]} y="132" width="5" height="42"></rect>
      </g>
      <g transform="translate(207 86)">
        <rect fill={colours[0]} y="36" width="5" height="70"></rect>
        <rect fill={colours[1]} width="5" height="28"></rect>
        <rect fill={colours[2]} y="132" width="5" height="32"></rect>
      </g>
      <g transform="translate(177 111)">
        <rect fill={colours[0]} y="36" width="5" height="85"></rect>
        <rect fill={colours[1]} width="5" height="28"></rect>
        <rect fill={colours[2]} y="132" width="5" height="42"></rect>
      </g>
      <g transform="translate(147 82)">
        <rect fill={colours[0]} y="102" width="5" height="90"></rect>
        <rect fill={colours[2]} y="210" width="5" height="22"></rect>
        <rect fill={colours[1]} width="5" height="80"></rect>
      </g>
      <g transform="translate(117 74)">
        <rect fill={colours[0]} y="51" width="5" height="160"></rect>
        <rect fill={colours[1]} width="5" height="14"></rect>
        <rect fill={colours[1]} y="23" width="5" height="20"></rect>
        <rect fill={colours[2]} y="246" width="5" height="24"></rect>
      </g>
      <g transform="translate(87 127)">
        <rect fill={colours[0]} y="64" width="5" height="50"></rect>
        <rect fill={colours[2]} y="144" width="5" height="64"></rect>
        <rect fill={colours[1]} width="5" height="30"></rect>
      </g>
      <g transform="translate(57 77)">
        <rect fill={colours[0]} y="104" width="5" height="80"></rect>
        <rect fill={colours[2]} y="204" width="5" height="74"></rect>
        <rect fill={colours[1]} width="5" height="34"></rect>
        <rect fill={colours[1]} y="32" width="5" height="40"></rect>
      </g>
      <g transform="translate(27 117)">
        <rect fill={colours[0]} y="84" width="5" height="80"></rect>
        <rect fill={colours[2]} y="184" width="5" height="34"></rect>
        <rect fill={colours[2]} y="232" width="5" height="14"></rect>
        <rect fill={colours[1]} width="5" height="40"></rect>
      </g>
    </g>
  </svg>
);

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const user = await findUser({ username });
  if (!user) {
    return {};
  }

  return {
    title: `A year of tvseri.es with ${user.username}`,
  };
}

export default async function StatsByYearPage({ params }: Props) {
  const { username } = await params;
  const user = await findUser({ username });
  if (!user) {
    return notFound();
  }

  return (
    <Page backgroundContext="dots">
      <div className="container relative h-[260px] sm:h-[325px] md:h-[390px]">
        <div className="absolute inset-0 [mask-image:linear-gradient(to_right,black,transparent_30%,transparent_70%,black)] xl:[mask-image:linear-gradient(to_right,black,transparent_35%,transparent_65%,black)]">
          <SvgPattern className="absolute left-[1rem] top-0 w-[280px] sm:w-[320px] md:w-[400px] lg:-top-8 lg:left-0 lg:w-[480px]" />
          <SvgPattern className="absolute right-[1rem] top-0 w-[280px] scale-x-[-1] sm:w-[320px] md:w-[400px] lg:-top-8 lg:right-0 lg:w-[480px]" />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-[6rem] font-extrabold leading-none tracking-wide sm:text-[8rem] md:text-[10rem]">
            2024
          </h1>
          <span className="mt-2 text-sm text-white/55 md:text-lg">
            A year of tvseri.es with
            <span
              className="ml-2 rounded px-2 py-1 text-white"
              style={{
                backgroundColor: colours[0],
              }}
            >
              koenoe
            </span>
          </span>
        </div>
      </div>
      <div className="container mt-8">blocks here</div>
    </Page>
  );
}
