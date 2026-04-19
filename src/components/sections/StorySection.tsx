'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import Image from 'next/image';
import { API_URL } from '@/lib/api';
import { fetchStorefrontBannerById } from '@/lib/integrationAdapters';
import { fetchStorefrontBannersForPosition } from '@/lib/storefrontBanners';

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
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    // Fetch store settings first
    fetch(`${API_URL}/api/storefront/settings`)
      .then(r => r.json())
      .then(settings => {
        if (settings?.storyTitle)       setStory(s => ({ ...s, title:          settings.storyTitle }));
        if (settings?.storyDescription) setStory(s => ({ ...s, description:    settings.storyDescription }));
        if (settings?.storyImageUrl)    setStory(s => ({ ...s, videoThumbnail: settings.storyImageUrl }));
        
        // Fetch explicit mapped video, or fallback to the latest uploaded story_video banner
        if (settings?.selectedStoryVideoId) {
          fetchStorefrontBannerById(settings.selectedStoryVideoId)
            .then((banner) => {
              const url = String(banner?.videoUrl ?? '').trim();
              if (url) setStory((s) => ({ ...s, videoUrl: url }));
            })
            .catch(e => console.error('Failed to fetch explicit story banner:', e));
        } else {
          // Fallback: Just grab the first active video banner in the story_video position
          fetchStorefrontBannersForPosition('story_video')
            .then((list) => {
              const withVideo = list.find(
                (b: { videoUrl?: string }) => String(b?.videoUrl ?? '').trim() !== '',
              );
              const url = withVideo?.videoUrl != null ? String(withVideo.videoUrl).trim() : '';
              if (url) {
                setStory((s) => ({ ...s, videoUrl: url }));
              }
            })
            .catch(e => console.error('Failed to fetch fallback story banners:', e));
        }
      })
      .catch(e => console.error('Failed to fetch store settings:', e));
  }, []);

  return (
    <section className="w-full py-20 bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left: Video thumbnail or Video Player */}
          {story.videoUrl ? (
            <div 
              className="relative w-full group cursor-pointer"
              onClick={togglePlay}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                <video 
                  ref={videoRef}
                  src={story.videoUrl} 
                  autoPlay 
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Play/Pause button */}
              <div className={`absolute z-20 transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}
                  bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2
                  md:bottom-auto md:left-auto md:top-1/2 md:right-0 md:translate-x-1/2 md:-translate-y-1/2`}>
                  <button className="w-16 h-16 bg-primary-dark text-white rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-2xl">
                    {isPlaying ? <Pause className="w-6 h-6" fill="none" /> : <Play className="w-6 h-6 ml-1" fill="none" />}
                  </button>
              </div>
            </div>
          ) : story.videoThumbnail ? (
            <div className="relative w-full group">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                <Image
                  src={story.videoThumbnail}
                  alt="Brand Story"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
          ) : null}

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
