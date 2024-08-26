export default function PageDivider() {
  return (
    <div className="relative mx-auto h-12 w-full md:h-20 md:w-[40rem]">
      {/* Gradients */}
      <div className="absolute inset-x-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/40 to-transparent blur-sm" />
      <div className="absolute inset-x-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <div className="absolute inset-x-1/4 top-0 h-[5px] w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent blur-sm md:inset-x-60 md:w-1/4" />
      <div className="absolute inset-x-1/4 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent md:inset-x-60 md:w-1/4" />
    </div>
  );
}
