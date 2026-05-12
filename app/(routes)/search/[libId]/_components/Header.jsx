import { Button } from '@/components/ui/button'
import { UserButton } from '@clerk/nextjs'
import { Clock, Link, Send } from 'lucide-react'
import moment from 'moment/moment'
import React from 'react'

function Header({ searchInputRecord }) {
  return (
    <div className='sticky top-0 z-40 bg-white border-b px-3 sm:px-5 py-3'>

      {/* ── Mobile layout: stacked two rows ── */}
      <div className='flex flex-col gap-2 sm:hidden'>
        {/* Row 1: avatar + timestamp on left, action buttons on right */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <UserButton />
            <div className='flex items-center gap-1 text-gray-500'>
              <Clock className='h-4 w-4 shrink-0' />
              <span className='text-xs'>{moment(searchInputRecord?.created_at).fromNow()}</span>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            {/* Icon-only link button */}
            <Button size='icon' variant='outline' className='h-8 w-8'>
              <Link className='h-4 w-4' />
            </Button>
            {/* Icon-only share button */}
            <Button size='icon' className='h-8 w-8'>
              <Send className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Row 2: search query title */}
        {searchInputRecord?.searchInput && (
          <p className='text-sm font-medium text-gray-800 line-clamp-2 leading-snug'>
            {searchInputRecord.searchInput}
          </p>
        )}
      </div>

      {/* ── Desktop layout: single row ── */}
      <div className='hidden sm:flex items-center justify-between gap-4'>
        {/* Left: avatar + timestamp */}
        <div className='flex items-center gap-2 shrink-0'>
          <UserButton />
          <div className='flex items-center gap-1 text-gray-500'>
            <Clock className='h-4 w-4' />
            <span className='text-sm'>{moment(searchInputRecord?.created_at).fromNow()}</span>
          </div>
        </div>

        {/* Centre: query title */}
        <h2 className='text-sm font-medium text-gray-800 line-clamp-1 flex-1 text-center px-4'>
          {searchInputRecord?.searchInput}
        </h2>

        {/* Right: buttons */}
        <div className='flex items-center gap-2 shrink-0'>
          <Button variant='outline' size='sm'>
            <Link className='h-4 w-4' />
          </Button>
          <Button size='sm'>
            <Send className='h-4 w-4 mr-1.5' />
            Share
          </Button>
        </div>
      </div>

    </div>
  )
}

export default Header
