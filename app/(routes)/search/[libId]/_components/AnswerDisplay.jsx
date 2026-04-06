import Image from 'next/image';
import React from 'react'

function AnswerDisplay({searchResult}) {
  const WebResult = searchResult?.organic_results;
  return (
    <div className='flex gap-2 flex-wrap mt-5'>
      {WebResult?.map((item,index)=>(
        <div  key={index} className='p-3 bg-accent rounded-lg w-[200px] cursor-pointer hover:bg-[#e1e3da]'
        onClick={()=>window.open(item.link,'_blank')}>
          <div className='flex gap-2 items-center'>
            <Image src={item?.about_this_result?.source?.icon}
             alt={item?.source} 
             width={20}
             height={20}/>
             <h2 className='text-xs'>
              {item?.source}
             </h2>
             
          </div>
          <h2 className='line-clamp-2 text-black text-xs'>
              {item?.about_this_result?.source?.description}
          </h2>
        </div>
      ))}
    </div>
  )
}

export default AnswerDisplay