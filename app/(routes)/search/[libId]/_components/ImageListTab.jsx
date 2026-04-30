import React, { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";

function ImageListTab({ chat }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (!chat?.userSearchInput) return;
    fetchImages(chat.userSearchInput);
  }, [chat?.userSearchInput]);

  const fetchImages = async (query) => {
    setLoading(true);
    try {
      const res = await fetch("/api/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchInput: query }),
      });
      const data = await res.json();
      setImages(data?.images ?? []);
    } catch (err) {
      console.error("Image fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2Icon className="animate-spin w-6 h-6 mr-2" />
        <span className="text-sm">Loading images...</span>
      </div>
    );
  }

  if (!images.length) {
    return (
      <p className="text-sm text-gray-400 mt-6 text-center">
        No images found for this query.
      </p>
    );
  }

  return (
    <div className="mt-5">
      {/* Masonry-style grid */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
        {images.map((img, index) => (
          <div
            key={index}
            className="break-inside-avoid cursor-pointer group relative overflow-hidden rounded-xl bg-gray-100"
            onClick={() => setSelectedImage(img)}
          >
            <img
              src={img.thumbnail}
              alt={img.title}
              className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-end">
              <p className="text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">
                {img.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.imageUrl || selectedImage.thumbnail}
              alt={selectedImage.title}
              className="w-full max-h-[60vh] object-contain bg-gray-50"
              onError={(e) => {
                e.target.src = selectedImage.thumbnail;
              }}
            />
            <div className="p-4">
              <p className="font-medium text-gray-800 text-sm line-clamp-2">
                {selectedImage.title}
              </p>
              {selectedImage.sourceDomain && (
                <a
                  href={selectedImage.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                >
                  {selectedImage.sourceDomain}
                </a>
              )}
            </div>
            <button
              className="absolute top-4 right-4 text-white text-xl font-bold bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageListTab;
