'use client';

import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';

import { API_URL } from '@/lib/api';

const DEFAULT = {
  kicker:         'ABOUT US',
  title:          'Thoughtfully designed for the journey of motherhood.',
  description:    'Aarah was born from a simple belief — that maternity wear should never feel like a compromise. Breathable fabrics, discreet nursing access, and silhouettes designed to grow with you. Because comfort and style should always walk together.',
  videoThumbnail: null as string | null,
  videoUrl:       null as string | null,
};

export default function QuoteBanner() {
  const [story, setStory] = useState(DEFAULT);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/settings`)
      .then(r => r.json())
      .then(settings => {
        if (settings?.storyTitle)       setStory(s => ({ ...s, title:          settings.storyTitle }));
        if (settings?.storyDescription) setStory(s => ({ ...s, description:    settings.storyDescription }));
        if (settings?.storyImageUrl)    setStory(s => ({ ...s, videoThumbnail: settings.storyImageUrl }));
        if (settings?.storyKicker)      setStory(s => ({ ...s, kicker:         settings.storyKicker }));
        
        // If there's a selected story video, fetch it from banners
        if (settings?.selectedStoryVideoId) {
          fetch(`${API_URL}/api/storefront/banners/${settings.selectedStoryVideoId}`)
            .then(r => r.json())
            .then(banner => {
              if (banner?.videoUrl) setStory(s => ({ ...s, videoUrl: banner.videoUrl }));
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="w-full py-24 bg-primary-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: Video */}
          {story.videoThumbnail && (
            <div className={`relative w-full group ${story.videoUrl ? 'cursor-pointer' : ''}`}>
              <div className="w-full aspect-[16/10] bg-gray-100 overflow-hidden relative">
                <img
                  src={story.videoThumbnail}
                  alt="About Us"
                  className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              {/* Desktop play button - only show if videoUrl exists */}
              {story.videoUrl && (
                <>
                  <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex">
                    <button className="w-20 h-20 bg-primary-dark text-white rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-xl">
                      <Play className="w-6 h-6 ml-1" fill="none" stroke="currentColor" strokeWidth={1.5} />
                    </button>
                  </div>
                  {/* Mobile play button */}
                  <div className="absolute inset-0 flex items-center justify-center md:hidden pointer-events-none">
                    <button className="w-16 h-16 bg-primary-dark text-white rounded-full flex items-center justify-center shadow-lg pointer-events-auto">
                      <Play className="w-5 h-5 ml-1" fill="none" stroke="currentColor" strokeWidth={1.5} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Right: Text */}
          <div className="flex flex-col justify-center lg:pl-8">
            <span className="font-sans text-[11px] uppercase tracking-widest text-primary-dark mb-6 font-medium">
              {story.kicker}
            </span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.2] text-primary-dark mb-6 pr-4">
              {story.title}
            </h2>
            <p className="font-sans text-[#555555] leading-relaxed text-[15px] max-w-lg">
              {story.description}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
