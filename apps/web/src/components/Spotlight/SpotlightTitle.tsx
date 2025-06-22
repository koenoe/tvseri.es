import { type TvSeries } from '@tvseri.es/types';
import { cva, type VariantProps } from 'class-variance-authority';
import Image from 'next/image';

const imageStyles = cva('relative w-full', {
  variants: {
    size: {
      small: ['h-24 md:h-36 md:w-[425px]'],
      medium: ['h-24 md:h-40 md:w-[500px]'],
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

const textStyles = cva(
  'relative w-full text-center font-bold !leading-tight  md:text-left md:w-3/5',
  {
    variants: {
      size: {
        small: ['text-xl md:text-2xl lg:text-3xl xl:text-4xl'],
        medium: ['text-3xl md:text-4xl lg:text-5xl xl:text-6xl'],
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  },
);

type TitleVariantProps = VariantProps<typeof imageStyles | typeof textStyles>;

export default function SpotlightTitle({
  className,
  item,
  size,
}: TitleVariantProps & Readonly<{ className?: string; item: TvSeries }>) {
  return (
    <>
      {item.titleTreatmentImage ? (
        <h1 className={imageStyles({ size, className })}>
          <Image
            className="object-contain object-bottom md:object-left-bottom"
            src={item.titleTreatmentImage}
            alt={item.title}
            priority
            fill
            draggable={false}
            unoptimized
          />
          <span className="hidden">{item.title}</span>
        </h1>
      ) : (
        <h1 className={textStyles({ size, className })}>{item.title}</h1>
      )}
    </>
  );
}
