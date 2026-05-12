import Image from 'next/image'
import React from 'react'

function SourceListTab({ chat }) {
  return (
    <div className="w-full px-0 sm:px-1">
      {chat.searchResult.map((item, index) => (
        <div
          key={index}
          onClick={() => window.open(item.link, '_blank')}
          className="
            group cursor-pointer
            rounded-xl p-3 sm:p-4
            hover:bg-accent active:scale-[0.99]
            transition-all duration-150
            mt-2 first:mt-0
          "
        >
          {/* Row 1: index + favicon + link */}
          <div className="flex gap-2 items-center min-w-0">
            {/* Index badge */}
            <span className="
              flex-shrink-0
              text-[10px] font-semibold text-gray-400
              w-5 h-5 rounded-full bg-accent
              flex items-center justify-center
              group-hover:bg-gray-200 transition-colors
            ">
              {index + 1}
            </span>

            {/* Favicon */}
            <div className="flex-shrink-0">
              <Image
                src={item.img || '/fallback-img.svg'}
                alt={item.title || 'source'}
                width={16}
                height={16}
                className="rounded-full w-4 h-4 sm:w-5 sm:h-5 border object-cover"
                onError={(e) => { e.currentTarget.src = '/fallback-img.svg'; }}
              />
            </div>

            {/* Link URL — truncated */}
            <h2 className="
              text-[11px] sm:text-xs text-gray-400
              truncate min-w-0 flex-1
              group-hover:text-gray-600 transition-colors
            ">
              {item.link}
            </h2>
          </div>

          {/* Row 2: Title */}
          <h2 className="
            mt-1.5 line-clamp-1
            font-bold
            text-sm sm:text-base lg:text-lg
            text-gray-700 group-hover:text-gray-900
            transition-colors
          ">
            {item.title}
          </h2>

          {/* Row 3: Description */}
          <p className="
            mt-1
            text-[11px] sm:text-xs
            text-gray-500 leading-relaxed
            line-clamp-2 sm:line-clamp-1
          ">
            {item.description}
          </p>

          {/* Divider */}
          {index < chat.searchResult.length - 1 && (
            <hr className="mt-3 sm:mt-4 border-gray-100" />
          )}
        </div>
      ))}
    </div>
  )
}

export default SourceListTab