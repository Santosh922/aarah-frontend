'use client';

import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface Variant {
  id?: string;
  size: string;
  color?: string;
  colorHex?: string;
  stock: number;
}

interface SizePopupProps {
  sizes: string[];
  variants?: Variant[];
  onSelect: (size: string) => void;
  onClose: () => void;
  position?: 'bottom-left' | 'bottom-right';
}

export default function SizePopup({ sizes, variants, onSelect, onClose, position = 'bottom-right' }: SizePopupProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const getStockForSize = (size: string) => {
    if (!variants) return null;
    return variants.find(v => v.size === size)?.stock ?? null;
  };

  const getColorForSize = (size: string) => {
    if (!variants) return null;
    return variants.find(v => v.size === size);
  };

  return (
    <div
      ref={ref}
      className={`absolute z-50 w-[200px] bg-white border border-gray-200 shadow-xl rounded-xl p-3.5 ${
        position === 'bottom-right' ? 'right-0' : 'left-0'
      }`}
      style={{ bottom: 'calc(100% + 8px)' }}
    >
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">Select Size</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-black transition-colors p-0.5"
          aria-label="Close size picker"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {sizes.map(size => {
          const stock = getStockForSize(size);
          const colorInfo = getColorForSize(size);
          const outOfStock = stock !== null && stock <= 0;

          return (
            <button
              key={size}
              onClick={() => !outOfStock && onSelect(size)}
              disabled={outOfStock}
              className={`relative py-1.5 text-[11px] font-semibold rounded border transition-all duration-150 ${
                outOfStock
                  ? 'border-gray-100 text-gray-300 cursor-not-allowed line-through'
                  : 'border-gray-200 text-gray-700 hover:border-black hover:bg-black hover:text-white'
              }`}
              aria-label={`Size ${size}${outOfStock ? ', out of stock' : ''}`}
            >
              {size}
              {colorInfo?.colorHex && !outOfStock && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: colorInfo.colorHex }}
                />
              )}
              {outOfStock && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-full h-px bg-gray-200 rotate-45" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[9px] text-gray-400 mt-2 text-center tracking-wide">
        Tap to add · Stock varies by size
      </p>
    </div>
  );
}
