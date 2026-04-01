'use client';


import { siteData } from '@/lib/siteConfig';
import { Scale, Truck, RotateCcw, ShieldCheck, FileText, Lock } from 'lucide-react';

export default function TermsPage() {
  const { termsPage } = siteData;

  if (!termsPage) return null;

  // Helper function to map string icon names from our DB to Lucide React components
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Scale': return <Scale className="w-5 h-5 text-primary-dark" strokeWidth={1.5} />;
      case 'Truck': return <Truck className="w-5 h-5 text-primary-dark" strokeWidth={1.5} />;
      case 'Refresh': return <RotateCcw className="w-5 h-5 text-primary-dark" strokeWidth={1.5} />;
      case 'Shield': return <ShieldCheck className="w-5 h-5 text-primary-dark" strokeWidth={1.5} />;
      case 'File': return <FileText className="w-5 h-5 text-primary-dark" strokeWidth={1.5} />;
      case 'Lock': return <Lock className="w-5 h-5 text-primary-dark" strokeWidth={1.5} />;
      default: return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HEADER SECTION */}
        <div className="text-center mb-24 mt-10">
          <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-gray-400 block mb-4">
            {termsPage.header.kicker}
          </span>
          <h1 className="font-serif text-4xl md:text-5xl text-primary-dark mb-6">
            {termsPage.header.title}
          </h1>
          <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-gray-400 max-w-xl mx-auto leading-loose">
            {termsPage.header.subtitle}
          </p>
        </div>

        {/* LIST OF TERMS */}
        <div className="flex flex-col space-y-16 mb-24">
          {termsPage.sections.map((section) => (
            <div key={section.id} className="flex flex-col md:flex-row items-start md:space-x-12">
              
              {/* Icon Container */}
              <div className="flex-shrink-0 mb-6 md:mb-0">
                <div className="w-14 h-14 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm">
                  {renderIcon(section.icon)}
                </div>
              </div>

              {/* Content Container */}
              <div className="flex flex-col flex-1">
                <h3 className="font-sans text-[11px] font-bold tracking-[0.2em] uppercase text-primary-dark mb-4">
                  {section.title}
                </h3>
                {/* Thin horizontal divider */}
                <div className="w-12 h-[1px] bg-gray-300 mb-6"></div>
                
                <p className="font-sans text-[10px] md:text-[11px] tracking-[0.15em] text-gray-500 leading-loose uppercase">
                  {section.text}
                </p>
              </div>

            </div>
          ))}
        </div>

        {/* BOTTOM CONTACT BOX */}
        <div className="bg-[#F4F4F4] py-16 px-6 flex flex-col items-center justify-center text-center mt-32">
          <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-gray-400 mb-10">
            {termsPage.contact.title}
          </span>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
            <div className="flex flex-col">
              <span className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase text-primary-dark mb-2">
                {termsPage.contact.email.label}
              </span>
              <a href={`mailto:${termsPage.contact.email.value}`} className="font-sans text-[11px] tracking-widest text-gray-500 hover:text-primary-dark transition-colors lowercase">
                {termsPage.contact.email.value}
              </a>
            </div>
            
            <div className="flex flex-col relative">
               {/* Vertical divider on desktop */}
              <div className="hidden md:block absolute -left-12 top-0 bottom-0 w-[1px] bg-gray-300"></div>
              
              <span className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase text-primary-dark mb-2">
                {termsPage.contact.phone.label}
              </span>
              <a href={`tel:${termsPage.contact.phone.value}`} className="font-sans text-[11px] tracking-widest text-gray-500 hover:text-primary-dark transition-colors uppercase">
                {termsPage.contact.phone.value}
              </a>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}