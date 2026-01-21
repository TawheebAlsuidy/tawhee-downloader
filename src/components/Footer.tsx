import React from 'react';
import { Download, Heart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Download className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">
                {t('title')}
              </h3>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              {t('subtitle')}
            </p>
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-400">
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">{t('quickLinks')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">{t('home')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('features')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('supportedSites')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('faq')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">{t('support')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">{t('helpCenter')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('contactUs')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('privacyPolicy')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('termsOfService')}</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>{t('footer')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;