import React from 'react'
import Image from 'next/image';
function SourceList({WebResult}) {
  return (
    <div className='flex gap-2 flex-wrap mt-5'>
          {WebResult?.map((item,index)=>(
        <div  key={index} className='p-3 bg-accent rounded-lg w-[200px] cursor-pointer hover:bg-[#e1e3da]'
        onClick={()=>window.open(item.url,'_blank')}>
          <div className='flex gap-2 items-center'>
            <Image src={item?.img}
             alt={item?.title} 
             width={20}
             height={20}/>
             <h2 className='text-xs'>
              {item?.title}
             </h2>
             
          </div>
          <h2 className='line-clamp-2 text-black text-xs'>
              {item?.description}
          </h2>
        </div>
      ))}
    </div>
  )
}

export default SourceList