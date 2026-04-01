'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, ChevronLeft, ChevronRight } from 'lucide-react';

import { API_URL } from '@/lib/api';

interface InstagramPost {
  id: string;
  imageUrl: string;
  caption?: string;
  link?: string;
}

export default function SocialFeed() {
  // 1. Data State
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [instagramUrl, setInstagramUrl] = useState('https://instagram.com');
  const [handle, setHandle] = useState('@aarah');
  const [loaded, setLoaded] = useState(false);

  // 2. Carousel State (Start at index 0)
  const [currentIndex, setCurrentIndex] = useState(0);

  // 3. Data Fetching
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/storefront/instagram`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/storefront/settings`).then(r => r.json()).catch(() => ({})),
    ]).then(([postsData, settings]) => {
      if (Array.isArray(postsData) && postsData.length > 0) {
        setPosts(postsData.slice(0, 5));
      }
      if (settings?.instagramUrl) setInstagramUrl(settings.instagramUrl);
      if (settings?.instagramHandle) setHandle(settings.instagramHandle);
    }).finally(() => setLoaded(true));
  }, []);

  if (!loaded || posts.length === 0) return null;

  // 4. Carousel Navigation Logic
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1 >= posts.length ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 < 0 ? posts.length - 1 : prev - 1));
  };

  // 5. 3D Spatial Math
  const getCardAnimation = (index: number) => {
    const diff = index - currentIndex;

    // Handle wrapping logic for continuous looping
    let visualDiff = diff;
    if (diff > 2) visualDiff = diff - posts.length;
    if (diff < -2) visualDiff = diff + posts.length;

    let x = 0;
    let rotateY = 0;
    let scale = 1;
    let zIndex = 10;
    let opacity = 1;

    if (visualDiff === 0) {
      x = 0; rotateY = 0; scale = 1; zIndex = 40; opacity = 1;
    } else if (visualDiff === 1) {
      x = 40; rotateY = -35; scale = 0.8; zIndex = 30; opacity = 0.6;
    } else if (visualDiff === -1) {
      x = -40; rotateY = 35; scale = 0.8; zIndex = 30; opacity = 0.6;
    } else if (visualDiff === 2) {
      x = 70; rotateY = -45; scale = 0.6; zIndex = 20; opacity = 0.3;
    } else if (visualDiff === -2) {
      x = -70; rotateY = 45; scale = 0.6; zIndex = 20; opacity = 0.3;
    } else {
      opacity = 0; scale = 0;
    }

    return { x: `${x}%`, rotateY: `${rotateY}deg`, scale, zIndex, opacity };
  };

  // Prevent rendering weird layout shifts while initial fetch is happening
  if (!loaded) return <div className="w-full h-[600px] bg-white animate-pulse" />;

  return (
    <section className="py-24 px-6 md:px-16 lg:px-24 bg-white overflow-hidden border-y border-gray-100">
      <div className="max-w-6xl mx-auto">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Instagram className="w-5 h-5 text-gray-400" />
              <span className="text-xs font-semibold tracking-widest uppercase text-gray-400">
                Visual Log
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black mb-2">
              Follow Our Journey.
            </h2>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-sm text-gray-400 hover:text-black transition-colors"
            >
              {handle}
            </a>
          </motion.div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrev}
              className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black hover:border-black transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black hover:border-black transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3D Carousel Viewport */}
        <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center [perspective:1200px]">
          <AnimatePresence initial={false}>
            {posts.map((post, index) => {
              const isCenter = index === currentIndex;

              return (
                <motion.div
                  key={post.id}
                  className="absolute w-[280px] h-[350px] md:w-[320px] md:h-[400px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
                  animate={getCardAnimation(index)}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => {
                    if (isCenter) {
                      // If it's already centered, click opens the link
                      window.open(post.link || instagramUrl, '_blank');
                    } else {
                      // If it's on the side, click brings it to the center
                      setCurrentIndex(index);
                    }
                  }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset }) => {
                    const swipe = offset.x;
                    if (swipe < -50) handleNext();
                    else if (swipe > 50) handlePrev();
                  }}
                >
                  {/* Image */}
                  <img
                    src={post.imageUrl}
                    alt={post.caption || `Instagram Post ${index}`}
                    className={`w-full h-full object-cover transition-all duration-700 ${
                      isCenter ? 'grayscale-0 filter-none' : 'grayscale contrast-125'
                    }`}
                  />

                  {/* Center Card Action Overlay */}
                  <div className={`absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-500 flex flex-col justify-end ${isCenter ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center gap-2 text-white mb-2">
                      <Instagram className="w-4 h-4" />
                      <span className="text-xs font-mono tracking-widest uppercase">View Post</span>
                    </div>
                    {post.caption && (
                      <p className="text-white/80 text-sm line-clamp-2 leading-tight">
                        {post.caption}
                      </p>
                    )}
                  </div>

                  {/* Side Card Darkening Overlay */}
                  {!isCenter && (
                    <div className="absolute inset-0 bg-black/20" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}