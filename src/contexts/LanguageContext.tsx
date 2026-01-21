import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LanguageContextType {
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    title: 'Tawheeb Downloader',
    subtitle: 'Download videos from YouTube, Facebook, Instagram and more',
    enterUrl: 'Enter video URL',
    urlPlaceholder: 'Paste your video URL here...',
    download: 'Download',
    preview: 'Preview',
    features: 'Features',
    fastDownload: 'Fast Download',
    fastDownloadDesc: 'Lightning-fast video downloads with optimized servers',
    multiPlatform: 'Multi-Platform',
    multiPlatformDesc: 'Support for YouTube, Facebook, Instagram, TikTok and more',
    highQuality: 'High Quality',
    highQualityDesc: 'Download videos in original quality up to 4K resolution',
    noWatermark: 'No Watermark',
    noWatermarkDesc: 'Clean downloads without any watermarks or logos',
    supportedPlatforms: 'Supported Platforms',
    howItWorks: 'How It Works',
    step1: 'Copy URL',
    step1Desc: 'Copy the video URL from any supported platform',
    step2: 'Paste & Preview',
    step2Desc: 'Paste the URL and preview the video before downloading',
    step3: 'Download',
    step3Desc: 'Choose your preferred quality and download instantly',
    footer: '© 2026 Tawheeb Downloader. All rights reserved.',
    downloading: 'Downloading...',
    error: 'Error occurred while processing the video',
    invalidUrl: 'Please enter a valid video URL',
    videoTitle: 'Video Title',
    duration: 'Duration',
    views: 'Views',
    selectQuality: 'Select Quality',
    downloadVideo: 'Download Video',
    downloadAudio: 'Download Audio Only',
    // VideoDownloader Specific
    selectFormat: "Select format",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",
    mb: "MB",
    videoOnly: "Video only",
    audioOnly: "Audio only",
    downloadingStatus: "Downloading — ",
    pausedStatus: "Paused",
    completedStatus: "Download completed successfully",
    failedStatus: "Download failed",
    stoppedStatus: "Stopped",
    // Footer
    quickLinks: "Quick Links",
    home: "Home",
    supportedSites: "Supported Sites",
    faq: "FAQ",
    support: "Support",
    helpCenter: "Help Center",
    contactUs: "Contact Us",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    madeWith: "Made with"
  },
  ar: {
    title: 'تحميل توهيب',
    subtitle: 'تحميل الفيديوهات من يوتيوب وفيسبوك وانستغرام والمزيد',
    enterUrl: 'أدخل رابط الفيديو',
    urlPlaceholder: 'الصق رابط الفيديو هنا...',
    download: 'تحميل',
    preview: 'معاينة',
    features: 'المميزات',
    fastDownload: 'تحميل سريع',
    fastDownloadDesc: 'تحميل فيديوهات سريع البرق مع خوادم محسنة',
    multiPlatform: 'متعدد المنصات',
    multiPlatformDesc: 'دعم يوتيوب وفيسبوك وانستغرام وتيك توك والمزيد',
    highQuality: 'جودة عالية',
    highQualityDesc: 'تحميل الفيديوهات بالجودة الأصلية حتى 4K',
    noWatermark: 'بدون علامة مائية',
    noWatermarkDesc: 'تحميل نظيف بدون أي علامات مائية أو شعارات',
    supportedPlatforms: 'المنصات المدعومة',
    howItWorks: 'كيف يعمل',
    step1: 'انسخ الرابط',
    step1Desc: 'انسخ رابط الفيديو من أي منصة مدعومة',
    step2: 'الصق وعاين',
    step2Desc: 'الصق الرابط وعاين الفيديو قبل التحميل',
    step3: 'حمل',
    step3Desc: 'اختر الجودة المفضلة وحمل فوراً',
    footer: '© 2026 تحميل توهيب. جميع الحقوق محفوظة.',
    downloading: 'جاري التحميل...',
    error: 'حدث خطأ أثناء معالجة الفيديو',
    invalidUrl: 'يرجى إدخال رابط فيديو صحيح',
    videoTitle: 'عنوان الفيديو',
    duration: 'المدة',
    views: 'المشاهدات',
    selectQuality: 'اختر الجودة',
    downloadVideo: 'تحميل الفيديو',
    downloadAudio: 'تحميل الصوت فقط',
    // VideoDownloader Specific
    selectFormat: "اختر الصيغة",
    pause: "إيقاف مؤقت",
    resume: "استكمال",
    stop: "إيقاف",
    mb: "ميجابايت",
    videoOnly: "فيديو فقط",
    audioOnly: "صوت فقط",
    downloadingStatus: "جاري التحميل — ",
    pausedStatus: "متوقف مؤقتاً",
    completedStatus: "تم التحميل بنجاح",
    failedStatus: "فشل التحميل",
    stoppedStatus: "متوقف",
    // Footer
    quickLinks: "روابط سريعة",
    home: "الرئيسية",
    supportedSites: "المنصات المدعومة",
    faq: "الأسئلة الشائعة",
    support: "الدعم",
    helpCenter: "مركز المساعدة",
    contactUs: "اتصل بنا",
    privacyPolicy: "سياسة الخصوصية",
    termsOfService: "شروط الخدمة",
    madeWith: "صنع بـ"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div className={language === 'ar' ? 'rtl' : 'ltr'} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};