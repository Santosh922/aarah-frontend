'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { API_URL } from '@/lib/api';
import Image from 'next/image';

interface MamaStoryBanner {
  id: string;
  imageUrl: string;
  videoUrl?: string;
  title?: string;
}

export default function DualFeaturePost() {
  const [videos, setVideos] = useState<MamaStoryBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingIds, setPlayingIds] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const togglePlay = (id: string) => {
    const el = videoRefs.current[id];
    if (el) {
      if (playingIds[id] === false) {
        el.play();
        setPlayingIds(p => ({ ...p, [id]: true }));
      } else {
        el.pause();
        setPlayingIds(p => ({ ...p, [id]: false }));
      }
    }
  };

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
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 lg:gap-10">
          {videos.map(video => {
            const isPlaying = playingIds[video.id] !== false; // default to true

            return (
              <div
                key={video.id}
                className="relative aspect-[9/16] w-full max-w-[280px] sm:max-w-[320px] rounded-2xl group overflow-hidden bg-gray-100 shadow-xl cursor-pointer shrink-0"
                onClick={() => togglePlay(video.id)}
              >
                {/* Video Player Only */}
                <video
                  ref={el => { videoRefs.current[video.id] = el; }}
                  src={video.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Play/Pause Button */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                  <button
                    className="w-16 h-16 bg-primary-dark text-white rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-xl border border-gray-700"
                    aria-label="Toggle video"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" fill="none" /> : <Play className="w-6 h-6 ml-1" fill="none" stroke="currentColor" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
