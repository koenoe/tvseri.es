export default function SkeletonSpotlight() {
  return (
    <div className="container relative">
      <div className="relative flex aspect-video h-[calc(95vh-16rem)] w-full overflow-hidden bg-white/5 shadow-2xl md:h-[calc(75vh-8rem)]">
        <div className="absolute inset-0 h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
      </div>
    </div>
  );
}
