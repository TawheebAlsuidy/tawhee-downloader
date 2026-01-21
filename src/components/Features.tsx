import React from 'react';
import { Zap, Globe, Sparkles, Shield } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Features: React.FC = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Zap,
      title: t('fastDownload'),
      description: t('fastDownloadDesc'),
      gradient: 'from-yellow-400 to-orange-500'
    },
    {
      icon: Globe,
      title: t('multiPlatform'),
      description: t('multiPlatformDesc'),
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Sparkles,
      title: t('highQuality'),
      description: t('highQualityDesc'),
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Shield,
      title: t('noWatermark'),
      description: t('noWatermarkDesc'),
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('features')}
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 mx-auto`}>
                <feature.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;