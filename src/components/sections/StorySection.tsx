'use client';

import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';

import { API_URL } from '@/lib/api';

// Real brand copy — replace lorem ipsum
const DEFAULT_STORY = {
  kicker:         'ABOUT US',
  title:          'Made for every stage of motherhood.',
  description:    'At Aarah, we believe every mother deserves to feel beautiful, comfortable, and confident — from the first trimester through nursing and beyond. Each piece is thoughtfully designed with breathable fabrics, discreet feeding access, and silhouettes that grow with you.',
  videoThumbnail: null as string | null,
  videoUrl:       null as string | null,
};

export default function StorySection() {
  const [story, setStory] = useState(DEFAULT_STORY);

  useEffect(() => {
    // Fetch store settings
    fetch(`${API_URL}/api/storefront/settings`)
      .then(r => r.json())
      .then(settings => {
        if (settings?.storyTitle)       setStory(s => ({ ...s, title:          settings.storyTitle }));
        if (settings?.storyDescription) setStory(s => ({ ...s, description:    settings.storyDescription }));
        if (settings?.storyImageUrl)    setStory(s => ({ ...s, videoThumbnail: settings.storyImageUrl }));
        
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
    <section className="w-full py-20 bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left: Video thumbnail */}
          {story.videoThumbnail && (
            <div className={`relative w-full group ${story.videoUrl ? 'cursor-pointer' : ''}`}>
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                <img
                  src={story.videoThumbnail}
                  alt="Brand Story"
                  className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              {/* Play button — only show if videoUrl exists */}
              {story.videoUrl && (
                <div className="absolute z-20
                  bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2
                  md:bottom-auto md:left-auto md:top-1/2 md:right-0 md:translate-x-1/2 md:-translate-y-1/2">
                  <button className="w-16 h-16 bg-primary-dark text-white rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-2xl">
                    <Play className="w-6 h-6 ml-1" fill="none" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Right: Text */}
          <div className="flex flex-col justify-center">
            <h2 className="font-serif text-3xl md:text-4xl lg:text-[2.5rem] leading-snug text-primary-dark mb-6">
              {story.title}
            </h2>
            <p className="font-sans text-gray-600 leading-relaxed text-sm md:text-base">
              {story.description}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
