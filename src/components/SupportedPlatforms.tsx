import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const SupportedPlatforms: React.FC = () => {
  const { t } = useLanguage();

  const platforms = [
    {
      name: 'YouTube',
      logo: 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=100',
      color: 'from-red-500 to-red-600'
    },
    {
      name: 'Facebook',
      logo: 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100',
      color: 'from-blue-600 to-blue-700'
    },
    {
      name: 'Instagram',
      logo: 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=100',
      color: 'from-pink-500 to-purple-600'
    },
    {
      name: 'TikTok',
      logo: 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100',
      color: 'from-gray-800 to-gray-900'
    },
    {
      name: 'Twitter',
      logo: 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=100',
      color: 'from-blue-400 to-blue-500'
    },
    {
      name: 'Vimeo',
      logo: 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100',
      color: 'from-cyan-500 to-blue-500'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('supportedPlatforms')}
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {platforms.map((platform, index) => (
            <div
              key={index}
              className="group flex flex-col items-center p-6 rounded-2xl hover:bg-gray-50 transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${platform.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-white font-bold text-lg">
                  {platform.name.charAt(0)}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 text-center">
                {platform.name}
              </h3>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-4 rtl:space-x-reverse bg-gradient-to-r from-blue-50 to-purple-50 px-8 py-4 rounded-2xl border border-blue-100">
            <div className="flex space-x-2 rtl:space-x-reverse">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-gray-700 font-medium">
              More platforms coming soon...
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupportedPlatforms;