'use client';

import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface MamaStoryBanner {
  id: string;
  imageUrl: string;
  videoUrl?: string;
  title?: string;
}

export default function DualFeaturePost() {
  const [videos, setVideos] = useState<MamaStoryBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/banners?position=mama_story`)
      .then(r => r.json())
      .then((data: MamaStoryBanner[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setVideos(data.slice(0, 2));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || videos.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-20 bg-primary-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
          {videos.map(video => (
            <div
              key={video.id}
              className="relative aspect-[4/5] md:aspect-square lg:aspect-[4/3] w-full group cursor-pointer overflow-hidden bg-gray-100 shadow-sm"
            >
              <img
                src={video.imageUrl}
                alt={video.title || 'Mama Story'}
                className="object-cover w-full h-full transition-transform duration-700 ease-out group-hover:scale-105 will-change-transform"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Only render as an anchor if we have a real video URL */}
                {video.videoUrl && video.videoUrl !== '#' ? (
                  <a
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="w-16 h-16 bg-primary-dark text-white rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-xl border border-gray-700"
                    aria-label="Play video"
                  >
                    <Play className="w-6 h-6 ml-1" fill="none" stroke="currentColor" strokeWidth={1.5} />
                  </a>
                ) : (
                  <button
                    className="w-16 h-16 bg-primary-dark text-white rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-xl border border-gray-700"
                    aria-label="Play video"
                  >
                    <Play className="w-6 h-6 ml-1" fill="none" stroke="currentColor" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
