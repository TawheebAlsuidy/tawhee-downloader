import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="">
              <img src="/main-image.png" alt="Logo" className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('title')}
            </h1>
          </div>

          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            >
              <Globe className="h-4 w-4" />
              <span className="text-sm font-medium">
                {language === 'en' ? 'العربية' : 'English'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;