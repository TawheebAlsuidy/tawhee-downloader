import React, { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Download,
  Play,
  Clock,
  Eye,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from '../contexts/LanguageContext';

interface FormatInfo {
  format_id: string;
  ext: string;
  quality?: string;
  filesize?: number | null;
  url?: string | null;
  acodec?: string;
  vcodec?: string;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number | string;
  views: number | string;
  formats: FormatInfo[];
  preview_url?: string | null;
}

const VideoDownloader: React.FC = () => {
  const { t, language } = useLanguage();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  // Local lang state removed in favor of global context
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const isRTL = language === 'ar';
  const eventSourceRef = useRef<EventSource | null>(null);

  const isValidUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  const formatDuration = (secs: number | string) => {
    if (!secs) return "";
    const s = Number(secs);
    if (isNaN(s)) return String(secs);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const formatNumber = (n: number | string) => {
    const num = Number(n) || 0;
    // use de-DE for dot thousands (1.234.567)
    return new Intl.NumberFormat('de-DE').format(num);
  };

  const handlePreview = async (urlOverride?: string) => {
    // If called from button (click event), urlOverride might be event object, so check type
    const targetUrl = (typeof urlOverride === 'string' && urlOverride) ? urlOverride : url;

    if (!targetUrl.trim() || !isValidUrl(targetUrl)) {
      setError(t("invalidUrl"));
      return;
    }

    setIsLoading(true);
    setError("");
    setVideoInfo(null);
    setProgress(0);
    setDownloadId(null);
    setDownloadStatus(null);

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || "Preview failed");
      }

      const data = await res.json();
      const info: VideoInfo = {
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration,
        views: data.views || 0,
        formats: data.formats || [],
        preview_url: data.preview_url || null,
      };
      setVideoInfo(info);

      const defaultFmt =
        info.formats.find((f) => f.ext === "mp4" && f.vcodec !== 'none' && f.acodec !== 'none') ||
        info.formats.find((f) => f.ext === "mp4") ||
        info.formats[0];
      setSelectedFormat(defaultFmt ? defaultFmt.format_id : "");
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // start download (get id), then attach SSE. Do NOT stream directly
  const startDownload = async (type: "video" | "audio") => {
    if (!url || !selectedFormat) {
      setError(t("invalidUrl"));
      return;
    }
    setError("");
    setProgress(1); // Start at 1% as requested
    setProgressText(t("downloading"));
    setDownloadStatus('created');
    setIsDownloading(true);

    try {
      const res = await fetch("/api/start-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pass info to avoid re-fetching on server
        body: JSON.stringify({ url, format: selectedFormat, type, info: videoInfo }),
      });
      if (!res.ok) {
        const body = await res.text();
        // try json parse
        try {
          const j = JSON.parse(body);
          throw new Error(j.error || body);
        } catch (e: any) {
          if (e.message && e.message !== 'Unexpected token') throw e;
          throw new Error(body || 'start failed');
        }
      }
      const data = await res.json();
      const id = data.id;
      setDownloadId(id);

      // Start the download process on the server
      await fetch(`/api/stream/${id}`);

      // attach SSE to receive progress
      attachEvents(id);

      setDownloadStatus('running');
    } catch (err: any) {
      setError(err.message || String(err));
      setDownloadStatus('failed');
      setIsDownloading(false);
    }
  };

  const attachEvents = (id: string) => {
    // cleanup existing
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch (e) { }
      eventSourceRef.current = null;
    }

    const es = new EventSource(`/api/events/${id}`);
    eventSourceRef.current = es;

    es.onmessage = (ev) => {
      try {
        const obj = JSON.parse(ev.data);
        if (obj.percent !== undefined) {
          const pct = Number(obj.percent);
          if (!isNaN(pct)) {
            setProgress(Math.max(0, Math.min(100, Math.round(pct))));
          }
        }
        if (obj.total) {
          setProgressText(obj.total + (obj.speed ? ` • ${obj.speed}` : ''));
        } else if (obj.eta) {
          setProgressText(`ETA ${obj.eta}`);
        } else if (obj.message) {
          setProgressText(String(obj.message).slice(0, 200));
        }

        if (obj.error) {
          setError(obj.error); // Show specific server error
          setDownloadStatus('failed');
          setIsDownloading(false);
          es.close();
          return;
        }

        if (obj.status) {
          setDownloadStatus(obj.status);
          if (obj.status === 'finished' && obj.downloadUrl) {
            // Trigger file save
            window.location.href = obj.downloadUrl;
            setIsDownloading(false);
            setProgress(100); // Ensure bar fills
            es.close();
          }
          if (obj.status === 'failed' || obj.status === 'stopped') {
            if (obj.error) setError(obj.error);
            setIsDownloading(false);
            es.close();
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // on error we keep trying if not finished
    };
  };

  const controlDownload = async (action: 'pause' | 'resume' | 'stop') => {
    if (!downloadId) return;
    try {
      await fetch(`/api/control/${downloadId}`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      // update UI state (SSE will also update it)
      if (action === 'pause') setDownloadStatus('paused');
      if (action === 'resume') setDownloadStatus('running');
      if (action === 'stop') setDownloadStatus('stopped');
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramUrl = params.get("url");
    if (paramUrl) {
      setUrl(paramUrl);
      setTimeout(() => {
        handlePreview(paramUrl);
      }, 0);
    }
    // cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close(); } catch (e) { }
      }
    };
  }, []);

  return (
    <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
            {t("title")}
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">{t("subtitle")}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
        <div className="mb-6">
          <label
            htmlFor="url"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t("enterUrl")}
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); setVideoInfo(null); }}
              placeholder={t("urlPlaceholder")}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <button
              onClick={handlePreview}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 rtl:space-x-reverse"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span className="hidden md:inline text-sm">{t("downloading")}</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  <span className="hidden md:inline text-sm">{t("preview")}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 rtl:space-x-reverse">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {videoInfo && (
          <div className="border-t pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                {/* If preview_url exists use video tag; else fallback to image */}
                {videoInfo.preview_url ? (
                  <video
                    src={videoInfo.preview_url || ''}
                    controls
                    poster={videoInfo.thumbnail}
                    preload="metadata"
                    playsInline
                    className="w-full h-48 object-cover rounded-lg"
                  />

                ) : (
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                {/* Progress bar under media */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                    <div className="truncate max-w-xs">{progressText || (progress > 0 ? `${progress}%` : '')}</div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      {/* Pause / Resume toggle small button */}
                      {downloadStatus === 'paused' ? (
                        <button
                          onClick={() => controlDownload('resume')}
                          title={t('resume')}
                          className="p-1 text-xs bg-yellow-100 hover:bg-yellow-200 border rounded transition-colors"
                        >
                          ▶
                        </button>
                      ) : (
                        <button
                          onClick={() => controlDownload('pause')}
                          title={t('pause')}
                          disabled={downloadStatus !== 'running'}
                          className={`p-1 text-xs bg-yellow-100 hover:bg-yellow-200 border rounded transition-colors ${downloadStatus !== 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          ⏸
                        </button>
                      )}
                      {/* Stop */}
                      <button
                        onClick={() => controlDownload('stop')}
                        title={t('stop')}
                        disabled={!downloadStatus || downloadStatus === 'stopped' || downloadStatus === 'finished'}
                        className={`p-1 text-xs bg-red-100 hover:bg-red-200 border rounded transition-colors ${(!downloadStatus || downloadStatus === 'stopped' || downloadStatus === 'finished') ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        ⏹
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {videoInfo.title}
                </h3>
                <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-600">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(videoInfo.duration)}</span>
                  </div>
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <Eye className="h-4 w-4" />
                    <span>
                      {formatNumber(videoInfo.views)} {t("views")}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("selectFormat")}
                  </label>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {videoInfo.formats.map((f) => (
                      <option key={f.format_id} value={f.format_id}>
                        {f.quality || f.ext} - {f.ext}
                        {f.filesize ? ` (${(f.filesize / 1024 / 1024).toFixed(1)} ${t('mb')})` : ""}
                        {f.vcodec !== "none" && f.acodec === "none" ? ` (${t('videoOnly')})` : ""}
                        {f.vcodec === "none" && f.acodec !== "none" ? ` (${t('audioOnly')})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 rtl:space-x-reverse">
                  <button
                    onClick={() => startDownload('video')}
                    disabled={isDownloading || downloadStatus === 'running'}
                    className={`flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse ${(isDownloading || downloadStatus === 'running') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isDownloading && downloadStatus === 'created' ? (
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>{t("downloadVideo")}</span>
                  </button>
                  <button
                    onClick={() => startDownload('audio')}
                    disabled={isDownloading || downloadStatus === 'running'}
                    className={`flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse ${(isDownloading || downloadStatus === 'running') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isDownloading && downloadStatus === 'created' ? (
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>{t("downloadAudio")}</span>
                  </button>
                </div>

                {/* small status text */}
                {downloadStatus && (
                  <div className={`text-sm mt-2 font-medium ${downloadStatus === 'finished' ? 'text-green-600' :
                    downloadStatus === 'failed' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                    {downloadStatus === 'running' && `${t('downloadingStatus')}${progress}%`}
                    {downloadStatus === 'paused' && t('pausedStatus')}
                    {downloadStatus === 'finished' && t('completedStatus')}
                    {downloadStatus === 'failed' && t('failedStatus')}
                    {downloadStatus === 'stopped' && t('stoppedStatus')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoDownloader;