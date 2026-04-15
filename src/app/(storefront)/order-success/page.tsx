'use client';

import { API_URL } from '@/lib/api';

import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Check, Download, Mail } from 'lucide-react';
import Link from 'next/link';

export default function OrderSuccessPage() {
  const { clearCart } = useCart();
  const [isAnimated, setIsAnimated] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [mailSent, setMailSent] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // 1. Grab order data
    const savedOrder = localStorage.getItem('aarah_last_order');
    if (savedOrder) {
      setOrderData(JSON.parse(savedOrder));
    }
    
    setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
    clearCart();

    const animationTimer = setTimeout(() => {
      setIsAnimated(true); 
      
      try {
        const successSound = new Audio('/success.mp3');
        successSound.volume = 0.5;
        successSound.play().catch(() => {});
      } catch (e) {}

      setTimeout(() => {
        setIsPrinting(true);
        try {
          const printSound = new Audio('/print.mp3'); 
          printSound.volume = 0.4;
          printSound.play().catch(() => {});
        } catch (e) {}
      }, 1000);

    }, 100);

    return () => clearTimeout(animationTimer);
  }, [clearCart]);

  const handleDownloadPDF = () => {
    // A small delay ensures the browser's print engine locks onto the fully rendered DOM
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleSendMail = async () => {
    // Backend has no receipt-mail endpoint yet; keep UI non-blocking.
    setMailSent(true);
    setTimeout(() => setMailSent(false), 3000);
  };

  // --- REUSABLE RECEIPT COMPONENT ---
  // Renders the exact same data for both the Screen Animation and the PDF Print
  const renderReceiptContent = () => (
    <>
      <div className="text-center mb-6 pb-6 border-b border-dashed border-gray-300">
        <h2 className="font-serif text-3xl text-primary-dark tracking-widest uppercase mb-1">AARAH</h2>
        <p className="font-sans text-[8px] text-gray-500 tracking-[0.2em] uppercase">Maternity & Nursing Wear</p>
        
        <div className="mt-6 flex flex-col space-y-1.5 items-center">
          <span className="bg-gray-100 text-primary-dark px-3 py-1 font-sans text-[10px] font-bold tracking-widest uppercase rounded-sm border border-gray-200">
            TAX INVOICE
          </span>
          <p className="font-sans text-[11px] text-primary-dark font-bold tracking-wider mt-2">Order: {orderData?.orderId || '#ARH-8921-X'}</p>
          <p className="font-sans text-[9px] text-gray-500 tracking-wider">
            Date: {orderData?.date || new Date().toLocaleDateString('en-IN')} | Time: {currentTime}
          </p>
        </div>
      </div>

      {orderData?.address && (
        <div className="mb-6 pb-6 border-b border-dashed border-gray-300 flex justify-between">
          <div className="flex flex-col">
            <span className="font-sans text-[8px] text-gray-400 tracking-widest uppercase mb-2">SHIPPED TO</span>
            <span className="font-sans text-[10px] font-bold text-primary-dark uppercase">{orderData.address.name}</span>
            <span className="font-sans text-[9px] text-gray-600 mt-1 uppercase leading-relaxed max-w-[200px]">
              {orderData.address.address}, {orderData.address.city} - {orderData.address.postalCode}
            </span>
            <span className="font-sans text-[9px] text-gray-600 mt-1">Ph: {orderData.address.phone}</span>
          </div>
        </div>
      )}

      <div className="mb-6 pb-6 border-b border-solid border-gray-200">
        <table className="w-full text-left">
          <thead>
            <tr className="font-sans text-[8px] text-gray-400 tracking-widest uppercase border-b border-gray-200">
              <th className="pb-3 font-normal">Item</th>
              <th className="pb-3 font-normal text-center">Qty</th>
              <th className="pb-3 font-normal text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {orderData?.items?.map((item: any, i: number) => (
              <tr key={i} className="font-sans text-[9px] text-primary-dark uppercase border-b border-dashed border-gray-100 last:border-0">
                <td className="py-4 pr-2">
                  <span className="block font-bold max-w-[140px] leading-relaxed">{item.name}</span>
                  <span className="text-[8px] text-gray-500 block mt-0.5">Size: {item.size}</span>
                </td>
                <td className="py-4 text-center">{item.quantity}</td>
                <td className="py-4 text-right">₹{(item.price * item.quantity).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col space-y-2.5 mb-8">
        <div className="flex justify-between font-sans text-[9px] text-gray-500 tracking-widest uppercase">
          <span>Subtotal</span>
          <span>₹{orderData?.subtotal?.toLocaleString('en-IN') || 0}</span>
        </div>
        {orderData?.discount > 0 && (
          <div className="flex justify-between font-sans text-[9px] text-semantic-success tracking-widest uppercase">
            <span>Discount</span>
            <span>-₹{orderData.discount.toLocaleString('en-IN')}</span>
          </div>
        )}
        <div className="flex justify-between font-sans text-[9px] text-gray-500 tracking-widest uppercase">
          <span>Shipping</span>
          <span>{orderData?.shipping === 0 ? 'FREE' : `₹${orderData?.shipping}`}</span>
        </div>
        <div className="flex justify-between font-sans text-[13px] font-bold text-primary-dark tracking-widest uppercase border-t border-gray-200 pt-3 mt-1">
          <span>Total Paid</span>
          <span>₹{orderData?.total?.toLocaleString('en-IN') || 0}</span>
        </div>
      </div>

      <div className="text-center font-sans text-[8px] text-gray-400 tracking-[0.2em] uppercase pt-4 border-t border-dashed border-gray-300">
        <p className="mb-1">Thank you for shopping with Aarah.</p>
        <p>Expected Delivery: 3-5 Working Days</p>
      </div>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Force page scaling and remove browser default headers/footers */
          @page { size: portrait; margin: 0; }
          
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }

          /* FORCE-HIDE ALL LAYOUT ELEMENTS (Navbars, Footers, Backgrounds) */
          header, footer, nav, #navbar, #footer, .navbar-container {
            display: none !important;
          }

          /* Hide the interactive screen UI */
          .screen-only {
            display: none !important;
          }

          /* Show ONLY the print receipt */
          .print-only {
            display: block !important;
            width: 100% !important;
            max-width: 800px !important;
            margin: 0 auto !important;
            padding: 40px !important;
          }
        }
      `}} />

      {/* ========================================================= */}
      {/* 1. VISUAL UI (Visible on Screen, HIDDEN when Printing)    */}
      {/* ========================================================= */}
      <main className="screen-only min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-start pt-32 pb-20 relative overflow-hidden">
        
        {/* --- COVER DIV (z-20): Solid BG to hide the receipt before it falls --- */}
        <div className="w-full bg-[#FAFAFA] relative z-20 flex flex-col items-center pt-8">
          
          {/* Green Check Icon */}
          <div className={`relative flex items-center justify-center w-[72px] h-[72px] rounded-full border-[3px] border-[#00a859] mb-8 transition-all duration-700 ${isAnimated ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
            <Check className={`w-8 h-8 text-[#00a859] transition-all duration-500 delay-300 ${isAnimated ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} strokeWidth={4} />
          </div>
          
          <h1 className="font-sans font-medium text-3xl md:text-[34px] text-[#191919] tracking-[0.15em] uppercase mb-6">
            Thank You
          </h1>
          
          <p className="font-sans text-[10px] md:text-[11px] text-gray-500 tracking-[0.12em] uppercase max-w-md leading-relaxed mb-4 text-center">
            Your order has been placed successfully. Order<br className="hidden sm:block"/> {orderData?.orderId || '#ARH-8921-X'}
          </p>
          
          <p className="font-sans text-[10px] md:text-[11px] text-[#00a859] font-medium tracking-[0.1em] uppercase mb-10 text-center">
            Product delivery will be 3-5 working days.
          </p>

{/* Action Buttons */}
<div className="flex flex-col items-center w-full px-4 max-w-md mb-12 space-y-4">

  {/* Back To Home - Full Width */}
  <Link
    href="/"
    className="w-full flex items-center justify-center bg-[#191919] text-white py-[18px] font-sans text-[11px] font-medium tracking-[0.2em] uppercase hover:bg-black transition-colors"
  >
    Back To Home
  </Link>

  {/* PDF + Email */}
  <div
    className={`w-full flex space-x-4 transition-all duration-1000 delay-[2500ms] ${
      isPrinting ? "opacity-100" : "opacity-0 pointer-events-none"
    }`}
  >
    <button
      onClick={handleDownloadPDF}
      className="flex-1 flex items-center justify-center space-x-2 bg-white border border-gray-200 text-primary-dark py-[18px] font-sans text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-gray-50 transition-colors"
    >
      <Download className="w-4 h-4" />
      <span>PDF</span>
    </button>

    <button
      onClick={handleSendMail}
      className="flex-1 flex items-center justify-center space-x-2 bg-white border border-gray-200 text-primary-dark py-[18px] font-sans text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-gray-50 transition-colors"
    >
      {mailSent ? (
        <Check className="w-4 h-4 text-semantic-success" />
      ) : (
        <Mail className="w-4 h-4" />
      )}
      <span className={mailSent ? "text-semantic-success" : ""}>
        {mailSent ? "Sent!" : "Email"}
      </span>
    </button>
  </div>

</div>

          {/* PRINTER SLOT (Bottom edge of the cover div) */}
          <div className="w-full max-w-md h-3 bg-gradient-to-b from-[#111] to-[#2A2A2A] rounded-t-md shadow-inner relative z-30 flex items-center">
             <div className="absolute right-6 w-1 h-1 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e] animate-pulse"></div>
          </div>
        </div>

        {/* --- RECEIPT DIV (z-10): Falls down the Y-Axis from behind the Cover Div --- */}
        {orderData && (
          <div className="w-full max-w-md mx-auto relative z-10 overflow-hidden">
            <div 
              className={`w-[92%] mx-auto bg-white shadow-2xl border-x border-b border-gray-200 relative pt-8 pb-12 px-6 sm:px-10 transition-transform ease-linear duration-[3000ms]
                ${isPrinting ? 'translate-y-0' : '-translate-y-full'}`}
            >
              {renderReceiptContent()}
              {/* Torn Edge effect */}
              <div className="absolute bottom-0 left-0 w-full h-3 bg-[radial-gradient(circle,transparent,transparent_50%,#FAFAFA_50%,#FAFAFA_100%)] bg-[length:12px_12px] bg-bottom" style={{ transform: 'translateY(100%)' }}></div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* 2. PRINT-ONLY UI (Hidden on Screen, VISIBLE when Printing)*/}
      {/* ========================================================= */}
      {orderData && (
        <div className="print-only hidden bg-white">
          {renderReceiptContent()}
        </div>
      )}
    </>
  );
}