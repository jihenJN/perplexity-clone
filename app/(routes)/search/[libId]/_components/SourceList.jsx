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
    <div className="flex gap-2 mt-5">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex-1 h-[72px] rounded-xl bg-accent animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="flex items-center gap-2 mt-5 max-w-3xl">
      {/* arrows outside, same row */}
      <Carousel className="flex-1 min-w-0" opts={{ align: 'start', dragFree: true }}>
        <div className="flex items-center gap-2">
          <CarouselPrevious className="static translate-y-0 flex-shrink-0" />
          <CarouselContent className="-ml-2.5">
            {WebResult?.map((item, index) => (
              <CarouselItem key={index} className="pl-2.5 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                <div
                  onClick={() => window.open(item.link, '_blank')}
                  className="p-3 bg-accent rounded-lg cursor-pointer hover:bg-[#e1e3da] transition-colors"
                >
                  <div className="flex gap-2 items-center mb-1">
                    <Image
                      src={item?.img || '/fallback-img.svg'}
                      alt={item?.title || 'source'}
                      width={16}
                      height={16}
                    />
                    <h2 className="text-xs font-medium truncate">{item?.title}</h2>
                  </div>
                  <p className="line-clamp-2 text-xs text-gray-500">{item?.description}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselNext className="static translate-y-0 flex-shrink-0" />
        </div>
      </Carousel>
    </div>
  );
}

export default SourceList;