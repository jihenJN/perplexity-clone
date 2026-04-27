import React from "react";

function NewsCard({ news }) {
  return (
    <div className="border rounded-2xl h-full mt-6 cursor-pointer" onClick={()=> window.open(news?.link,'_blank')}>
      <img src={news?.favicon} alt={news.title}
       className="w-full h-[200px] object-cover rounded-2xl"/>
      <div className="p-4">
        <h2 className="font-bold text-lg text-gray-600">{news?.title}</h2>
        <p className="text-md mt-2 line-clamp-2 text-gray-500">{news?.snippet}</p>
      </div>
    </div>
  );
}

export default NewsCard;
