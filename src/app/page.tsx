import Image from 'next/image';
import Page from '@/components/Page';
import hexToRgb from '@/utils/hexToRgb';

const backgroundUrl =
  'https://image.tmdb.org/t/p/original/7aPrv2HFssWcOtpig5G3HEVk3uS.jpg';
const titleTreatmentUrl =
  'https://image.tmdb.org/t/p/original/eWUohy0Wn7X5AXSwKI8KOdb3gbi.png';
const backgroundColor = '#1A1715';

export default async function Home() {
  const [r, g, b] = hexToRgb(backgroundColor);
  const rgbForRgba = `${r},${g},${b}`;

  return (
    <Page backgroundColor={backgroundColor} backgroundImage={backgroundUrl}>
      <div className="container relative">
        <div className="relative flex aspect-video h-[calc(100vh-16rem)] w-full items-center overflow-hidden shadow-2xl md:h-[calc(70vh-8rem)] md:items-end">
          <div className="absolute inset-0 transform-gpu">
            <Image
              className="object-cover"
              src={backgroundUrl}
              alt=""
              priority
              fill
            />
            <div
              className="absolute inset-0 opacity-80"
              style={{
                backgroundImage: `linear-gradient(270deg, rgba(${rgbForRgba}, 0) 0%, rgba(${rgbForRgba}, 0.4) 50%, rgba(${rgbForRgba}, 1) 100%)`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(rgba(${rgbForRgba}, 0) 0%, rgba(${rgbForRgba}, 0.7) 100%)`,
              }}
            />
          </div>
          <div className="relative w-full p-6 md:w-4/5 md:p-14 lg:p-20">
            <h1 className="relative !mb-8 h-8 w-full md:min-h-10">
              <Image
                className="object-contain object-center md:object-left"
                src={titleTreatmentUrl}
                alt=""
                priority
                fill
              />
            </h1>
            <div className="flex gap-4 md:gap-12">
              <div className="flex w-full justify-center gap-2 text-sm md:justify-start md:text-base">
                <div className="after:content-['_·_']">2h 3m</div>
                <div className="after:content-['_·_']">
                  Action, Adventure, Drama
                </div>
                <div>2024</div>
              </div>
            </div>
          </div>
          <div className="absolute left-0 top-10 flex w-full items-center justify-center gap-2">
            <div className="h-3 w-3 rounded-full bg-white/20 backdrop-blur-2xl" />
            <div className="h-3 w-3 rounded-full bg-white" />
            <div className="h-3 w-3 rounded-full bg-white/20 backdrop-blur-2xl" />
            <div className="h-3 w-3 rounded-full bg-white/20 backdrop-blur-2xl" />
            <div className="h-3 w-3 rounded-full bg-white/20 backdrop-blur-2xl" />
            <div className="h-3 w-3 rounded-full bg-white/20 backdrop-blur-2xl" />
            <div className="h-3 w-3 rounded-full bg-white/20 backdrop-blur-2xl" />
            <div className="h-3 w-3 rounded-full bg-white/20 backdrop-blur-2xl" />
            <div className="h-3 w-3 rounded-full bg-white/20 backdrop-blur-2xl" />
            <div className="h-3 w-3 rounded-full bg-white/20 backdrop-blur-2xl" />
          </div>
          <div className="absolute bottom-[-1.5rem] right-[-1rem] text-[10rem] font-bold leading-none opacity-20 md:bottom-[-5rem] md:right-[-3rem] md:text-[30rem]">
            2
          </div>
        </div>

        <div className="relative flex h-screen w-full items-center justify-center">
          rest of content
        </div>
      </div>
    </Page>
  );
}
