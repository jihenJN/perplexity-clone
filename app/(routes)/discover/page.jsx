"use client";
import React, { useEffect, useState } from "react";
import {
  Cpu,
  DollarSign,
  Globe,
  Palette,
  Star,
  Volleyball,
} from "lucide-react";
import axios from "axios";
import moment from "moment/moment";

const options = [
  { title: "Top", icon: Star, query: "top news today" },
  { title: "Tech & Science", icon: Cpu, query: "technology science news" },
  {
    title: "Finance",
    icon: DollarSign,
    query: "finance business economy news",
  },
  {
    title: "Art & Culture",
    icon: Palette,
    query: "art culture entertainment news",
  },
  { title: "Sports", icon: Volleyball, query: "sports news today" },
];

function NewsCard({ news, featured = false }) {
  if (!news?.thumbnail) return null; // ← add this
  const handleClick = () => window.open(news?.link, "_blank");

  if (featured) {
    return (
      <article
        onClick={handleClick}
        className="group cursor-pointer rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
      >
        {/* Hero image */}
        <div className="relative h-56 w-full bg-gray-100 overflow-hidden">
          {news?.thumbnail ? (
            <img
              src={news.thumbnail}
              alt={news?.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextSibling.style.display = "flex";
                 e.currentTarget.closest("article").style.display = "none"
              }}
            />
          ) : null}
          <div
            className={`${news?.thumbnail ? "hidden" : "flex"} absolute inset-0 items-center justify-center bg-accent/20 text-primary/20`}
          >
            <Globe className="h-16 w-16" />
          </div>
          {/* Featured badge */}
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
            <Star className="h-3 w-3" /> Featured
          </span>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-3">
          <h2 className="text-xl font-bold leading-snug text-gray-900 group-hover:text-primary transition-colors line-clamp-2">
            {news?.title}
          </h2>
          {/* Source + date */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-1.5">
              {news?.sourceIcon && (
                <img
                  src={news.sourceIcon}
                  alt=""
                  className="h-4 w-4 rounded-sm object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none" , e.currentTarget.closest("article").style.display = "none")}
                />
              )}
              <span className="text-xs font-semibold text-gray-600">
                {news?.source}
              </span>
            </div>
            {news?.date && (
              <span className="text-xs text-gray-400">
                {" "}
                {moment(news?.date).fromNow()}
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={handleClick}
      className="group cursor-pointer rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-full flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative h-40 w-full bg-gray-100 overflow-hidden shrink-0">
        {news?.thumbnail ? (
          <img
            src={news.thumbnail}
            alt={news?.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "flex";
               e.currentTarget.closest("article").style.display = "none"
            }}
          />
        ) : null}
        <div
          className={`${news?.thumbnail ? "hidden" : "flex"} absolute inset-0 items-center justify-center bg-accent/10 text-primary/20`}
        >
          <Globe className="h-8 w-8" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="text-sm font-semibold leading-snug text-gray-800 group-hover:text-primary transition-colors line-clamp-2 flex-1">
          {news?.title}
        </h3>

        {/* Source + date row */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
          <div className="flex items-center gap-1.5 min-w-0">
            {news?.sourceIcon && (
              <img
                src={news.sourceIcon}
                alt=""
                className="h-3.5 w-3.5 rounded-sm object-contain shrink-0"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
            <span className="text-xs font-semibold text-gray-600 truncate">
              {news?.source}
            </span>
          </div>
          {news?.date && (
            <span className="text-xs text-gray-400 shrink-0 ml-2">
              {moment(news?.date).fromNow()}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard({ featured = false }) {
  if (featured) {
    return (
      <div className="animate-pulse rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="h-56 w-full bg-gray-100" />
        <div className="p-5 flex flex-col gap-3">
          <div className="h-5 w-3/4 rounded bg-gray-100" />
          <div className="h-5 w-1/2 rounded bg-gray-100" />
          <div className="flex justify-between pt-2 border-t border-gray-50">
            <div className="h-3 w-20 rounded bg-gray-100" />
            <div className="h-3 w-16 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="animate-pulse rounded-xl border border-gray-100 bg-white overflow-hidden flex flex-col">
      <div className="h-40 w-full bg-gray-100" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 w-4/5 rounded bg-gray-100" />
        <div className="flex justify-between pt-2 border-t border-gray-50 mt-1">
          <div className="h-3 w-16 rounded bg-gray-100" />
          <div className="h-3 w-14 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

// ─── Discover ──────────────────────────────────────────────────────────────────

function Discover() {
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(options[0]);
  const [latestNews, setLatestNews] = useState([]);

  useEffect(() => {
    if (selectedOption) GetSearchResult();
  }, [selectedOption]);

  const GetSearchResult = async () => {
    setLoading(true);
    setLatestNews([]);
    try {
      const result = await axios.post("/api/news-search", {
        searchInput: selectedOption.query,
      });
      setLatestNews(result?.data?.news ?? []);
    } catch (error) {
      console.error("Failed to load news:", error);
    } finally {
      setLoading(false);
    }
  };

  const featured = latestNews.find((n) => n?.thumbnail);
  const rest = latestNews.filter((n) => n !== featured && n?.thumbnail);

  return (
    <div className="mt-20 px-4 md:px-10 lg:px-20 xl:px-36 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary">
          <Globe className="h-5 w-5" />
        </div>
        <h1 className="font-bold text-2xl tracking-tight text-gray-900">
          Discover
        </h1>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-8 scrollbar-none">
        {options.map((option, index) => {
          const Icon = option.icon;
          const active = selectedOption.title === option.title;
          return (
            <button
              key={index}
              onClick={() => setSelectedOption(option)}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                transition-all duration-150 cursor-pointer select-none
                ${
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                }
              `}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {option.title}
            </button>
          );
        })}
      </div>

      {/* News grid */}
      {loading ? (
        <div className="flex flex-col gap-6">
          <SkeletonCard featured />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      ) : latestNews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
          <Globe className="h-10 w-10 opacity-30" />
          <p className="text-sm">No news found. Try another category.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Featured article */}
          {featured && <NewsCard news={featured} featured />}

          {/* Secondary divider */}
          {rest.length > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Latest
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          )}

          {/* Card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((news, index) => (
              <NewsCard key={index} news={news} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Discover;
