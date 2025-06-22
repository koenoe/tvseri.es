'use client';

import noise from '@/assets/noise.webp';

const Noise = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 h-full w-full scale-[1.2] transform opacity-10 [mask-image:radial-gradient(#fff,transparent,75%)]"
      style={{
        backgroundImage: `url(${noise.src})`,
        backgroundSize: '30%',
      }}
    />
  );
};

export default Noise;
