import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

function SourceList({ WebResult, loadingSearch }) {
  if (loadingSearch) return (
    <div className="flex gap-2 mt-5 w-full overflow-hidden">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="h-[72px] rounded-xl bg-accent animate-pulse
            w-full
            sm:flex-1
          "
        />
      ))}
    </div>
  );

  return (
    <div className="w-full mt-5">
      <Carousel
        opts={{
          align: 'start',
          dragFree: true,
        }}
        className="w-full"
      >
        {/* On mobile: hide arrows and rely on swipe; show arrows sm+ */}
        <div className="relative flex items-center gap-1">
          <CarouselPrevious
            className="
              hidden sm:flex
              static translate-y-0 flex-shrink-0
              h-7 w-7
            "
          />

          <CarouselContent className="-ml-2 sm:-ml-2.5 flex-1">
            {WebResult?.map((item, index) => (
              <CarouselItem
                key={index}
                className="
                  pl-2 sm:pl-2.5
                  basis-[70%]
                  xs:basis-[55%]
                  sm:basis-1/2
                  md:basis-1/3
                  lg:basis-1/4
                  xl:basis-1/5
                "
              >
                <div
                  onClick={() => window.open(item.link, '_blank')}
                  className="
                    p-2.5 sm:p-3
                    bg-accent rounded-lg cursor-pointer
                    hover:bg-[#e1e3da]
                    active:scale-[0.98]
                    transition-all duration-150
                    h-full
                  "
                >
                  <div className="flex gap-2 items-center mb-1 min-w-0">
                    <div className="flex-shrink-0">
                      <Image
                        src={item?.img || '/fallback-img.svg'}
                        alt={item?.title || 'source'}
                        width={14}
                        height={14}
                        className="sm:w-4 sm:h-4"
                        onError={(e) => { e.currentTarget.src = '/fallback-img.svg'; }}
                      />
                    </div>
                    <h2 className="text-xs font-medium truncate leading-tight">
                      {item?.title}
                    </h2>
                  </div>
                  <p className="line-clamp-2 text-[11px] sm:text-xs text-gray-500 leading-snug">
                    {item?.description}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselNext
            className="
              hidden sm:flex
              static translate-y-0 flex-shrink-0
              h-7 w-7
            "
          />
        </div>
      </Carousel>

      {/* Swipe hint — only on touch / mobile */}
      {WebResult?.length > 1 && (
        <p className="mt-2 text-[10px] text-gray-400 sm:hidden text-right pr-1 select-none">
          Swipe to see more →
        </p>
      )}
    </div>
  );
}

export default SourceList;