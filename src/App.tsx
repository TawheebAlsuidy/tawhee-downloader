import React, { useEffect } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import Header from './components/Header';
import VideoDownloader from './components/VideoDownloader';
import Features from './components/Features';
import SupportedPlatforms from './components/SupportedPlatforms';
import Footer from './components/Footer';

function App() {
  useEffect(() => {
    // Listen for messages from Chrome extension
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'TAWHEEB_URL') {
        // Auto-fill the URL input when receiving from extension
        const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement;
        if (urlInput) {
          urlInput.value = event.data.url;
          urlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <main>
          <VideoDownloader />
          <Features />
          <SupportedPlatforms />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}

export default App;