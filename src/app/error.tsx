'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AARAH_ERROR]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white px-4">
      <div className="text-center">
        <h1 className="font-serif text-3xl md:text-4xl text-[#191919] mb-3">
          Something went wrong
        </h1>
        <p className="font-sans text-sm text-gray-500 mb-8 max-w-md">
          We encountered an unexpected error. Your cart and saved items are safe.
        </p>
        <button
          onClick={reset}
          className="bg-[#191919] hover:bg-black text-white text-xs font-bold tracking-widest uppercase px-10 py-4 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
