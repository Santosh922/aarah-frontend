'use client';

import { X, Tag } from 'lucide-react';
import type { Coupon } from '@/types';

interface CouponsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (coupon: Coupon) => void;
  coupons: Coupon[];
}

export default function CouponsModal({ isOpen, onClose, onApply, coupons }: CouponsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[400px] shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-sans text-[14px] tracking-[0.2em] font-bold text-[#191919] uppercase flex items-center gap-2">
            <Tag className="w-4 h-4" /> Available Offers
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-black transition-colors"><X className="w-5 h-5" strokeWidth={1.5} /></button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-[#FAFAFA]">
          {coupons.length === 0 ? (
            <p className="text-center font-sans text-[11px] text-gray-500 tracking-widest uppercase py-8">No offers available right now.</p>
          ) : (
            coupons.map((coupon, i) => (
              <div key={i} className="bg-white border border-gray-200 p-4 relative shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-sans text-[13px] font-bold tracking-widest uppercase text-[#191919] border border-dashed border-gray-300 px-2 py-1 bg-gray-50">
                    {coupon.code}
                  </span>
                  <button onClick={() => { onApply(coupon); onClose(); }} className="font-sans text-[10px] font-bold tracking-widest uppercase text-blue-600 hover:text-blue-800 underline underline-offset-2">
                    Apply
                  </button>
                </div>
                <p className="font-sans text-[11px] text-gray-600 leading-relaxed mb-2">{coupon.desc}</p>
                <p className="font-sans text-[9px] text-gray-400 uppercase tracking-wider">{coupon.terms}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
