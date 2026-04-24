export const siteData = {
// 1. Navigation Data
  navigation: {
    topNavLinks: [
      { name: "HOME", href: "/", active: true },
      { name: "ABOUT", href: "/about" },
      { name: "CONTACT US", href: "/contact" },
    ],
    lowerNavLinks: [
      { name: "CATEGORIES", href: "/shop" },
      { name: "BEST-SELLERS", href: "/best-sellers" },
      { name: "NEW ARRIVALS", href: "/new-arrivals" },
    ]
  },


  // 2. Hero Section
  hero: {
    title: "Made for Motherhood from Maternity to Feeding.",
    subtitle: "Breathable fabrics. Thoughtful silhouettes. Discreet feeding access. Designed to support you during pregnancy and beyond.",
    buttonText: "SHOP NOW",
    buttonLink: "/shop/all",
    imagePath: "/assets/images/journey-banner.jpg", 
  },

  // 3. About Us / Story Section
  story: {
    kicker: "ABOUT US",
    title: "Clothing that celebrates every stage of your motherhood journey.",
    description: "At AARAH, we believe pregnancy, postpartum recovery, and nursing are chapters to be honored — not hidden. Every stitch is designed to move with you, grow with you, and make you feel beautiful exactly as you are. From breathable maternity wear to discreet nursing designs, we craft clothing that understands what your body needs and what your heart wants.",
    videoThumbnail: "/assets/images/about-us-video.jpg",
    videoUrl: "#", 
  },

  // 4. Shop By Fabrics (data now sourced dynamically from /api/storefront/fabrics)
  fabrics: {
    title: "SHOP BY FABRICS",
    buttonText: "SHOP NOW",
    buttonLink: "/shop/fabrics",
  },

  // 5. Featured Promo Blocks (Bento)
  featuredBlocks: [
    {
      id: 1,
      title: "New Arrivals",
      buttonText: "SHOP THE LATEST",
      buttonLink: "/shop/new-arrivals",
      image: "/assets/images/promo-1.jpg", 
    },
    {
      id: 2,
      title: "Best-Sellers",
      buttonText: "SHOP YOUR FAVORITES",
      buttonLink: "/shop/best-sellers",
      image: "/assets/images/promo-2.jpg",
    },
    {
      id: 3,
      title: "The Holiday Outfit",
      buttonText: "SHOP OCCASION",
      buttonLink: "/shop/holiday",
      image: "/assets/images/promo-3.jpg",
    }
  ],

  // 6. Journey Page Break Banner
  journeyBanner: {
    title: "Beautiful through every stage of motherhood.",
    subtitle: "Comfort that grows with you.",
    imagePath: "/assets/images/journey-banner.jpg", 
  },

  favorites: {
    products: [
      {
        id: 'p1',
        name: 'Maternity Kurti',
        url: '/product/maternity-kurti',
        price: 1999,
        originalPrice: 2199,
        discount: '10% OFF',
        image: '/assets/images/product-hero.jpg', // Main image (make sure this path is valid)
        images: [ // Gallery thumbnails (re-using main for placeholder)
          '/assets/images/product-hero.jpg',
          '/assets/images/product-hero.jpg',
          '/assets/images/product-hero.jpg',
          '/assets/images/product-hero.jpg',
          '/assets/images/product-hero.jpg',
          '/assets/images/product-hero.jpg',
        ],
        subtitle: 'Designed for comfort and style through every stage of motherhood.',
        description: 'Maternity Comfort: We strictly adhere to a clear unboxing video policy for any exchange or return claim. To maintain our high standards of quality and service, we adhere to a define.\nPostpartum Ease: Designed for comfort and style through every stage, including postpartum.\nFeeding-Friendly: Discreet zippers and smart designs for easy nursing.\nSustainability: Designed with eco-friendly and recycled materials for a cleaner journey.',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        // DYNAMIC REVIEWS FOR THIS PRODUCT
        reviews: [
          {
            id: 1,
            reviewerName: 'Elizabeth Robyn',
            reviewerDetails: 'Height: 5\'6" - 5\'8", Weight: 150 - 160 lb, Body Type: Pear',
            rating: 5,
            date: '4 days ago',
            title: ' Warm and very attractive on',
            content: 'Due to keep my husband warm as those chilly late fall days. He loves it as it not only is pretty warm but he looks good in it and he knows it.',
          },
          {
            id: 2,
            reviewerName: 'Anonymous',
            reviewerDetails: 'Height: 5\'2" - 5\'4", Weight: 140 - 150 lb, Body Type: Petite',
            rating: 5,
            date: '5 days ago',
            title: 'great comfy',
            content: 'Great quality, warm and super comfy. Got the XL cuz I have a large back and it fits perfect. It does run a bit oversized which is great.',
          },
        ]
      },
      // Limited details for other products to avoid bloat in testing
      { id: "p2", name: "Feeding-Friendly Kurti", url: "/product/feeding-friendly-kurti", price: 1999, originalPrice: 2099, image: "/assets/images/favorites-placeholder.jpg", sizes: ["S", "M", "L", "XL"], reviews: [], images: ['/assets/images/favorites-placeholder.jpg'] },
      { id: "p3", name: "Comfort Nursing Top", url: "/product/comfort-nursing-top", price: 1999, originalPrice: 2099, image: "/assets/images/favorites-placeholder.jpg", sizes: ["XS", "S", "M", "L"], reviews: [], images: ['/assets/images/favorites-placeholder.jpg'] },
      { id: "p4", name: "Maternity Palazzo", url: "/product/maternity-palazzo", price: 1999, originalPrice: 2099, image: "/assets/images/favorites-placeholder.jpg", sizes: ["S", "M", "L", "XL"], reviews: [], images: ['/assets/images/favorites-placeholder.jpg'] },
    ],
  },
  // 8. Mamas Around Us (Dual Video)
  mamasStories: {
    title: "Mamas Around Us",
    subtitle: "HEAR FROM OUR COMMUNITY OF MOTHERS WHO CHOOSE COMFORT AND STYLE.",
    videos: [
      {
        id: "v1",
        imagePath: "/assets/images/mama-story-1.jpg", 
        videoUrl: "#", 
      },
      {
        id: "v2",
        imagePath: "/assets/images/mama-story-2.jpg", 
        videoUrl: "#",
      }
    ]
  },

  // 9. Social Feed Configuration
  instagram: {
    handle: "@aaraha_thaimai_aadai",
    brandImage: "/assets/images/instagram-brand.jpg"
  },
  // 10. Footer Configuration
footer: {
    brandText: "Beautiful through every stage of motherhood.",
    menus: [
      { name: "CATEGORIES", href: "/shop" },
      { name: "AVAILABLE FABRICS", href: "/shop/fabrics" },
      { name: "BEST-SELLERS", href: "/best-sellers" },
      { name: "NEW ARRIVALS", href: "/new-arrivals" }
    ],
    social: {
      instagram: "https://instagram.com"
    },
    copyrightLeft: "© 2026 All Rights Reserved",
    copyrightRight: "© 2023 All Rights Reserved"
  },
  // 9. Social Feed Configuration
  socialFeed: {
    title: "Follow Instagram",
    subtitle: "Follow us for styling inspiration, real motherhood stories, and behind-the-scenes glimpses into our design process.",
    imagePath: "/assets/images/instagram-feed.jpg",
  },

  // 10. Pre-Footer Trust Badges
  trustBadges: [
    {
      id: 1,
      title: "Maternity Comfort",
      description: "Made from breathable, natural fabrics that keep you cool and comfortable throughout your day.",
    },
    {
      id: 2,
      title: "Postpartum Ease",
      description: "Made from breathable, natural fabrics that keep you cool and comfortable throughout your day.",
    },
    {
      id: 3,
      title: "Feeding-Friendly Functionality",
      description: "Made from breathable, natural fabrics that keep you cool and comfortable throughout your day.",
    }
  ],
  // 12. Checkout Data (Dynamic DB Mock)
  checkoutData: {
    addresses: [
      { id: 1, name: "RAHUL SHARMA", address: "123, LOTUS APARTMENT, WORLI", city: "MUMBAI, 400018" },
      { id: 2, name: "RAHUL SHARMA", address: "45, GREEN VALLEY, MG ROAD", city: "PUNE, 411001" }
    ],
    coupons: [
      { id: "c1", code: "AARAH10", type: "percentage", value: 10, description: "10% OFF" },
      { id: "c2", code: "WELCOME20", type: "fixed", value: 200, description: "₹200 OFF" }
    ]
  },

  // --- NEW: ABOUT PAGE DATA ---
  aboutPage: {
    hero: {
      title: "Motherhood is a Journey not just a moment.",
      subtitle: "Breathable fabrics. Thoughtful silhouettes. Designed to support you during pregnancy and beyond.",
      imagePath: "/assets/images/about-hero.jpg" 
    },
    philosophy: {
      text: "At AARAH - Thaimai Aadai we create clothing that supports women during pregnancy, after delivery, and through their breastfeeding journey.",
      perks: [
        { id: 1, title: "THOUGHTFUL DESIGN", desc: "Every AARAH piece is engineered for real bodies — with nursing access, adjustable fits, and elegant silhouettes." },
        { id: 2, title: "BREATHABLE FABRICS", desc: "We source only natural, skin-friendly fabrics that keep you cool, comfortable, and confident." },
        { id: 3, title: "ETHICAL PRODUCTION", desc: "Every garment is crafted in small batches by skilled artisans, with zero compromise on quality." }
      ]
    },
    stages: {
      title: "Designed for Every Stage",
      description: "From the first trimester to the final weeks and beyond, AARAH adapts to your changing body and evolving style.",
      categories: [
        { title: "MATERNITY COMFORT", items: ["Breathable organic cotton", "Stretchy silhouettes", "Bump-friendly cuts"] },
        { title: "POSTPARTUM EASE", items: ["Soft on healing skin", "Relaxed fit for comfort", "Easy to wash and wear"] },
        { title: "FEEDING-FRIENDLY", items: ["Discreet zip access", "Overlap styling", "Double layered protection"] }
      ],
      mainImage: "/assets/images/stage-main.jpg", // The portrait image
      subImage: "/assets/images/stage-sub.jpg"   // The overlapping fabric square
    },
    whyChoose: {
      title: "Why\nChoose\nAARAH?",
      reasons: [
        { title: "PREMIUM FABRICS", desc: "Hand-picked natural materials that feel gentle against your skin and stand the test of time." },
        { title: "ETHICAL ETHOS", desc: "Sustainable, small-batch production with zero waste — because beauty should not cost the earth." },
        { title: "THOUGHTFUL DESIGN", desc: "Designed by mothers, for mothers — every feature serves a real need from real life." },
        { title: "LOCAL ARTISANS", desc: "Made with pride by Indian craftspeople. Every purchase supports livelihoods and traditional skills." }
      ]
    },
    story: {
      title: "AARAH - Thaimai Aadai was founded with a beautiful vision - to celebrate women in their most transformative phase: motherhood.",
      description: "AARAH was born from a simple realization: mothers deserve clothing that works as hard as they do. Founded by sisters Priya and Kavya, the brand began in a small Chennai studio with one mission — to create maternity and nursing wear that never compromises on comfort, style, or dignity. Today, every AARAH piece carries that same spirit: beautiful craftsmanship for life's most transformative journey.",
      imagePath: "/assets/images/our-story.jpg" // The macrame wall hanging image
    },
    banner: {
      title: "Your journey deserves beautiful support",
      subtitle: "Comfort that grows with you.",
      buttonText: "EXPLORE THE COLLECTION",
      buttonLink: "/shop",
      imagePath: "/assets/images/journey-forest.jpg" // The green forest banner
    }
  },
// --- NEW: TERMS PAGE DATA ---
  termsPage: {
    header: {
      kicker: "LEGAL FRAMEWORK",
      title: "Terms & Conditions",
      subtitle: "LAST UPDATED: MARCH 8, 2026. PLEASE READ THESE TERMS CAREFULLY BEFORE ENGAGING WITH OUR BRAND."
    },
    sections: [
      {
        id: 1,
        icon: "Scale",
        title: "AGREEMENT TO TERMS",
        text: "BY ACCESSING OR USING THE AARAH WEBSITE, YOU AGREE TO BE BOUND BY THESE TERMS AND CONDITIONS AND OUR PRIVACY POLICY. THESE TERMS APPLY TO ALL VISITORS, USERS, AND OTHERS WHO ACCESS THE SERVICE."
      },
      {
        id: 2,
        icon: "Truck",
        title: "SHIPPING & DELIVERY",
        text: "WE STRIVE TO DELIVER OUR PREMIUM MATERNITY WEAR WITHIN A 3-5 DAY TIMELINE ACROSS MAJOR REGIONS. WHILE WE AIM FOR PROMPT DELIVERY, EXTERNAL FACTORS BEYOND OUR CONTROL MAY OCCASIONALLY CAUSE DELAYS. ALL SHIPMENTS ARE HANDLED WITH THE UTMOST CARE TO ENSURE YOUR AARAH PIECE ARRIVES IN PRISTINE CONDITION."
      },
      {
        id: 3,
        icon: "Refresh",
        title: "EXCHANGE POLICY (STRICT 48-HOUR)",
        text: "TO MAINTAIN OUR HIGH HYGIENE AND QUALITY STANDARDS, WE STRICTLY ADHERE TO A 48-HOUR EXCHANGE POLICY. YOU MUST INITIATE THE EXCHANGE PROCESS WITHIN 2 DAYS OF RECEIVING YOUR ORDER. EXCHANGES ARE PERMITTED EXCLUSIVELY FOR SIZE ADJUSTMENTS OR MANUFACTURING DEFECTS. WE DO NOT OFFER REFUNDS UNDER ANY CIRCUMSTANCES."
      },
      {
        id: 4,
        icon: "Shield",
        title: "MANDATORY UNBOXING VIDEO",
        text: "FOR ANY EXCHANGE CLAIM TO BE VALID, A CONTINUOUS UNBOXING VIDEO MUST BE RECORDED FROM THE MOMENT THE PACKAGE IS SEALED UNTIL THE GARMENT IS FULLY INSPECTED. THIS VIDEO IS OUR ONLY METHOD OF VERIFYING THE CONDITION OF THE CLOTH UPON ARRIVAL. FAILURE TO PROVIDE A CLEAR UNBOXING VIDEO WILL RESULT IN THE AUTOMATIC REJECTION OF THE EXCHANGE REQUEST."
      },
      {
        id: 5,
        icon: "File",
        title: "INTELLECTUAL PROPERTY",
        text: "THE SERVICE AND ITS ORIGINAL CONTENT, FEATURES, AND FUNCTIONALITY (INCLUDING BUT NOT LIMITED TO ALL DESIGNS, TEXT, GRAPHICS, AND LOGOS) ARE AND WILL REMAIN THE EXCLUSIVE PROPERTY OF AARAH. OUR DESIGNS ARE CRAFTED WITH CARE AND PROTECTED BY INTELLECTUAL PROPERTY LAWS."
      },
      {
        id: 6,
        icon: "Lock",
        title: "LIMITATION OF LIABILITY",
        text: "IN NO EVENT SHALL AARAH BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES RESULTING FROM THE USE OF OUR PRODUCTS. OUR LIABILITY IS LIMITED TO THE PURCHASE PRICE OF THE SPECIFIC ITEM IN QUESTION."
      }
    ],
    contact: {
      title: "QUESTIONS REGARDING OUR TERMS?",
      email: { label: "EMAIL INQUIRY", value: "legal@aarah.com" },
      phone: { label: "SUPPORT LINE", value: "+91 (800) AARAH-01" }
    }
  },
  // --- NEW: CONTACT PAGE DATA ---
  contactPage: {
    hero: {
      kicker: "CONNECT WITH US",
      title: "We're here for\nyour journey.",
      imagePath: "https://images.unsplash.com/photo-1555252834-4b5377f0dfb2?q=80&w=2560&auto=format&fit=crop"
    },
    formSection: {
      kicker: "DIRECT MESSAGE",
      title: "How can we assist you?",
      description: "WHETHER YOU HAVE QUESTIONS ABOUT FABRIC CUSTOMIZATION, SIZE ADJUSTMENTS, OR AN EXISTING ORDER, OUR TEAM IS DEDICATED TO PROVIDING PERSONALIZED SUPPORT."
    },
    infoSection: {
      title: "REACH OUT",
      items: [
        {
          id: 1,
          icon: "Mail",
          title: "EMAIL INQUIRY",
          value: "hello@aarah.com",
          subtext: "GENERAL & PRESS"
        },
        {
          id: 2,
          icon: "Phone",
          title: "PHONE SUPPORT",
          value: "+91 (800) AARAH-01",
          subtext: "MON - SAT, 10AM - 6PM"
        },
        {
          id: 3,
          icon: "MessageCircle", // Acts as the WhatsApp icon
          title: "WHATSAPP",
          value: "+91 98765 43210",
          subtext: "INSTANT ASSISTANCE"
        }
      ]
    }
  },

  //THIS IS COUPONS ARRAY:
coupons: [
    { code: 'AARAH10', type: 'PERCENTAGE', value: 10, desc: '10% OFF', terms: 'On orders above ₹1,000' },
    { code: 'WELCOME200', type: 'FIXED', value: 200, desc: '₹200 OFF', terms: 'Valid on your first purchase' },
    { code: 'FREESHIP', type: 'FREE_SHIPPING', value: 0, desc: 'FREE SHIPPING', terms: 'On all prepaid orders' },
    { code: 'BOGO', type: 'BOGO', value: 0, desc: 'BUY 1 GET 1 FREE', terms: 'Add 2 eligible items to cart' }
  ],

  pageBanners: {
    bestSellers: [
      { id: 'b1', url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=2070', alt: 'Summer Maternity Collection' },
      { id: 'b2', url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2070', alt: 'Comfort Nursing Wear' },
      { id: 'b3', url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=2070', alt: 'Everyday Essentials' }
    ],
    newArrivals: [
      { id: 'n1', url: 'https://images.unsplash.com/photo-1515347619253-12fb3b34208a?auto=format&fit=crop&q=80&w=2070', alt: 'Fresh Spring Styles' },
      { id: 'n2', url: 'https://images.unsplash.com/photo-1502716115624-b565f1a9b9a8?auto=format&fit=crop&q=80&w=2070', alt: 'Elegant Evening Maternity' },
      { id: 'n3', url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=2071', alt: 'Premium Organic Cotton' }
    ]
  },
};
