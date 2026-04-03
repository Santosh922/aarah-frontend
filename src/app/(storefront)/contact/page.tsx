import { API_URL } from '@/lib/api';
import ContactForm from './ContactForm';
import { siteData } from '@/lib/siteConfig';

async function getContactBanner() {
  try {
    const res = await fetch(`${API_URL}/api/storefront/banners?position=contact_section`, { cache: 'no-store' });
    if (!res.ok) return null;
    const banners = await res.json();
    if (!Array.isArray(banners) || banners.length === 0) return null;
    return banners[0];
  } catch {
    return null;
  }
}

async function getStoreSettings() {
  try {
    const res = await fetch(`${API_URL}/api/storefront/settings`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ContactPage() {
  const banner = await getContactBanner();
  const settings = await getStoreSettings();
  const { contactPage } = siteData;

  if (!contactPage) return null;

  // Override hardcoded config with dynamic store settings
  const infoItems = contactPage.infoSection.items.map((item: any) => {
    if (item.id === 1 && settings?.email) {
      return { ...item, value: settings.email };
    }
    if (item.id === 2 && settings?.phone) {
      return { ...item, value: settings.phone };
    }
    return item;
  });

  return (
    <main className="min-h-screen bg-white pt-20">
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full h-[40vh] min-h-[350px] flex items-center justify-center text-center">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img
          src={banner?.imageUrl || contactPage.hero.imagePath}
          alt="Contact Aarah"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="relative z-20 flex flex-col items-center px-4">
          <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-white mb-4">
            {contactPage.hero.kicker}
          </span>
          <h1 className="font-serif text-4xl md:text-5xl text-white whitespace-pre-line leading-tight">
            {contactPage.hero.title}
          </h1>
        </div>
      </section>

      {/* 2. MAIN CONTENT AREA */}
      <section className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
          
          {/* LEFT COLUMN: The Form */}
          <div className="lg:col-span-8 px-6 md:px-16 lg:px-24 py-20 bg-white flex flex-col justify-center">
            <div className="max-w-xl">
              <span className="font-sans text-[10px] italic tracking-[0.2em] uppercase text-gray-400 mb-6 block">
                {contactPage.formSection.kicker}
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-primary-dark mb-6">
                {contactPage.formSection.title}
              </h2>
              <p className="font-sans text-[9px] tracking-[0.15em] leading-loose text-gray-500 uppercase mb-14">
                {contactPage.formSection.description}
              </p>
              <ContactForm />
            </div>
          </div>

          {/* RIGHT COLUMN: Contact Info */}
          <div className="lg:col-span-4 bg-[#F4F4F4] px-6 md:px-16 lg:px-12 py-20 flex flex-col justify-center">
            <span className="font-sans text-[10px] font-bold tracking-[0.2em] uppercase text-primary-dark mb-12 block">{contactPage.infoSection.title}</span>
            <div className="flex flex-col space-y-12">
              {infoItems.map((item: any) => (
                <div key={item.id} className="flex items-start space-x-4">
                  <div className="mt-1">{item.icon}</div>
                  <div className="flex flex-col">
                    <span className="font-sans text-[9px] font-bold tracking-[0.15em] uppercase text-primary-dark mb-2">{item.title}</span>
                    <span className="font-sans text-[11px] tracking-widest text-gray-500 mb-1">{item.value}</span>
                    <span className="font-sans text-[8px] italic tracking-[0.1em] text-gray-400 uppercase">{item.subtext}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
