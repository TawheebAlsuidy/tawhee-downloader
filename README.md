# Tawheeb Downloader

A professional video downloader website with bilingual support (English/Arabic) and Chrome extension integration.

## Features

- **Multi-platform Support**: Download videos from YouTube, Facebook, Instagram, TikTok, Twitter, and Vimeo
- **Bilingual Interface**: Full support for English and Arabic with RTL layout
- **Video Preview**: Preview videos before downloading
- **Multiple Quality Options**: Choose from various video qualities
- **Chrome Extension**: Seamless integration with hover download buttons
- **Responsive Design**: Optimized for all devices
- **Professional UI**: Modern design with smooth animations

## Chrome Extension

The included Chrome extension adds download buttons to supported video platforms:

### Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `public/chrome-extension` folder
4. The extension will be installed and ready to use

### Usage

1. Visit any supported video platform (YouTube, Facebook, Instagram, etc.)
2. Hover over video thumbnails or the main video player
3. Click the download button that appears
4. The Tawheeb Downloader website will open with the video URL pre-filled

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Supported Platforms

- YouTube (youtube.com, youtu.be)
- Facebook (facebook.com)
- Instagram (instagram.com)
- TikTok (tiktok.com)
- Twitter (twitter.com)
- Vimeo (vimeo.com)

## Production Deployment

For production use, you'll need to:

1. Implement a backend API for actual video downloading (Django/Python recommended)
2. Update the Chrome extension URLs to point to your production domain
3. Add proper video processing and download functionality
4. Implement user authentication and rate limiting
5. Add analytics and monitoring

## Technical Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Extension**: Chrome Extension Manifest V3

## License

© 2024 Tawheeb Downloader. All rights reserved.