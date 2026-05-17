// components/VideoListTab.jsx
import React from "react";
import { Loader2Icon, PlayCircle } from "lucide-react";
import { useSearchMedia } from "./useSearchMedia";

function VideoListTab({ chat }) {
  const { items: videos, loading, error } = useSearchMedia(
    chat?.userSearchInput,
    "/api/video-search",
    "videos",
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2Icon className="animate-spin w-6 h-6 mr-2" />
        <span className="text-sm">Loading videos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-500 mt-6 text-center">
        {error}
      </p>
    );
  }

  if (!videos.length) {
    return (
      <p className="text-sm text-gray-400 mt-6 text-center">
        No videos found for this query.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video, index) => (
          <a
            key={index}
            href={video.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200 bg-white"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-100 overflow-hidden">
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => (e.target.style.display = "none")}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <PlayCircle className="w-10 h-10 text-gray-400" />
                </div>
              )}
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200">
                <PlayCircle className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              {/* Duration badge */}
              {video.duration && (
                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                  {video.duration}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                {video.title}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                {video.channel && <span>{video.channel}</span>}
                {video.channel && video.publishedDate && <span>·</span>}
                {video.publishedDate && <span>{video.publishedDate}</span>}
              </div>
              {video.platform && (
                <span className="mt-2 inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                  {video.platform}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default VideoListTab;
