'use client';

import { useState } from 'react';
import { X, Clock, Video, RotateCcw, ShieldAlert, Check } from 'lucide-react';

interface ExchangePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgreeToPay: () => void;
}

export default function ExchangePolicyModal({ isOpen, onClose, onAgreeToPay }: ExchangePolicyModalProps) {
  const [hasAgreed, setHasAgreed] = useState(false);

  if (!isOpen) return null;

  const policyItems = [
    {
      icon: <Clock className="w-6 h-6 text-[#191919]" strokeWidth={1.5} />,
      title: '48-HOUR WINDOW',
      desc: 'EXCHANGE REQUESTS MUST BE INITIATED WITHIN 48 HOURS (2 DAYS) OF RECEIVING YOUR DELIVERY.',
    },
    {
      icon: <Video className="w-6 h-6 text-[#191919]" strokeWidth={1.5} />,
      title: 'UNBOXING VIDEO',
      desc: 'A MANDATORY OPENING VIDEO IS REQUIRED FOR ALL EXCHANGE CLAIMS TO VERIFY THE CONDITION OF THE GARMENT.',
    },
    {
      icon: <RotateCcw className="w-6 h-6 text-[#191919]" strokeWidth={1.5} />,
      title: 'SIZE & DEFECTS',
      desc: 'EXCHANGES ARE STRICTLY PERMITTED FOR SIZE ADJUSTMENTS OR MANUFACTURING DEFECTS ONLY.',
    },
    {
      icon: <ShieldAlert className="w-6 h-6 text-[#191919]" strokeWidth={1.5} />,
      title: 'NO REFUNDS',
      desc: 'AARAH MAINTAINS A STRICT NO-REFUND POLICY. WE OFFER EXCHANGES TO ENSURE YOU FIND YOUR PERFECT FIT.',
    },
  ];

  const handleAgree = () => {
    if (hasAgreed) {
      onAgreeToPay();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-white/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-[1000px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] flex flex-col z-10 px-8 py-16 md:px-16 md:py-20 max-h-[95vh] overflow-y-auto">
        
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 md:top-8 md:right-8 text-gray-400 hover:text-black transition-colors"
        >
          <X className="w-6 h-6" strokeWidth={1} />
        </button>

        <div className="text-center mb-16">
          <span className="font-sans text-[10px] md:text-[11px] tracking-[0.3em] text-gray-500 uppercase block mb-4">
            THE AARAH COMMITMENT
          </span>
          <h2 className="font-serif text-4xl md:text-5xl text-[#191919] mb-6">
            Our Exchange Policy
          </h2>
          <p className="font-sans text-[10px] md:text-[11px] text-gray-500 tracking-[0.15em] uppercase max-w-2xl mx-auto leading-relaxed">
            TO MAINTAIN OUR HIGH STANDARDS OF QUALITY AND SERVICE, WE ADHERE TO A REFINED EXCHANGE PROCESS.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 mb-20">
          {policyItems.map((item, index) => (
            <div key={index} className="flex flex-col items-center text-center px-2">
              <div className="w-20 h-20 rounded-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center justify-center mb-8">
                {item.icon}
              </div>
              <h4 className="font-sans text-[11px] font-bold tracking-[0.15em] uppercase text-[#191919] mb-4">
                {item.title}
              </h4>
              <p className="font-sans text-[10px] text-gray-500 leading-[1.8] tracking-widest uppercase">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-md mx-auto w-full flex flex-col items-center">
          
          <button 
            type="button"
            onClick={() => setHasAgreed(!hasAgreed)}
            className="w-full bg-[#FAFAFA] hover:bg-[#F3F3F3] transition-colors py-4 px-6 flex items-center justify-center space-x-4 mb-6 cursor-pointer rounded-sm"
          >
            <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-[3px] transition-colors ${hasAgreed ? 'bg-[#00a859]' : 'bg-white border border-gray-300'}`}>
              {hasAgreed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </div>
            <span className="font-sans text-[12px] md:text-[13px] text-[#191919] tracking-[0.05em] uppercase font-medium mt-0.5">
              I AGREED TO THE EXCHANGE POLICY
            </span>
          </button>

          <button
            onClick={handleAgree}
            disabled={!hasAgreed}
            className={`w-full py-4 text-[13px] font-sans tracking-[0.15em] uppercase transition-all duration-300 ${
              hasAgreed 
                ? 'bg-[#191919] text-white hover:bg-black shadow-md cursor-pointer' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Agree to pay
          </button>
        </div>

      </div>
    </div>
  );
}
