// server.js
import express from 'express';
import cors from 'cors';
import { exec, spawn } from 'child_process';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Utility: Ensure temp dir exists
const TEMP_DIR = path.join(process.cwd(), 'temp_downloads');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// In-memory downloads store
const downloads = {}; // id -> { params, proc, emitter, status, filename, createdAt }

// Define local yt-dlp path
// Define local yt-dlp path or system path
const isWin = process.platform === 'win32';
const ytDlpExe = isWin ? path.join(process.cwd(), 'yt-dlp.exe') : 'yt-dlp';

// Helper: run yt-dlp -j to get info
function getInfo(url) {
  return new Promise((resolve, reject) => {
    // Use TV client - supports high res and bypasses 403
    // Use android_creator client - good balance of resolution and access
    // Check for cookies.txt
    let cookieArg = '';
    if (fs.existsSync(path.join(process.cwd(), 'cookies.txt'))) {
      cookieArg = `--cookies "${path.join(process.cwd(), 'cookies.txt')}"`;
    }

    const cmd = `"${ytDlpExe}" ${cookieArg} --js-runtimes node --force-ipv4 -j "${url.replace(/"/g, '\\"')}"`;
    exec(cmd, { maxBuffer: 1024 * 1024 * 20 }, (err, stdout, stderr) => {
      if (err) {
        // include stderr to help debug
        return reject(stderr || err.message);
      }
      try {
        const info = JSON.parse(stdout);
        resolve(info);
      } catch (e) {
        reject(e.message || stdout);
      }
    });
  });
}

// Utility: safe filename from title - محسنة للتعامل مع الأحرف الخاصة
// Utility: safe filename from title - preserve Arabic and spaces
function safeFilename(title) {
  const name = String(title || 'video').trim();
  // Replace ONLY characters that are illegal in Windows/Unix filenames
  // ( / \ ? % * : | " < > . ) - dots are tricky if at end, generally keep them in middle
  // We keep spaces and unicode characters
  return name.replace(/[\/\\?%*:|"<>]/g, '_');
}

// Utility: generate id
function genId() {
  return crypto.randomBytes(8).toString('hex');
}

// Preview endpoint — returns formats and preview_url (if available)
app.post('/api/preview', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  try {
    const info = await getInfo(url);

    // Filter and Process Formats:
    // 1. Filter out non-video (unless audio-only), storyboards, mhtml
    // 2. Group by resolution (height) to avoid duplicates
    // 3. Prefer MP4 and higher bitrate
    const rawFormats = info.formats || [];
    const uniqueFormats = new Map(); // height -> formatObj

    for (const f of rawFormats) {
      // Skip invalid protocols or storyboard formats
      if (f.protocol === 'mhtml' || f.protocol === 'https_html') continue;
      // Strict check for storyboard IDs (sb0, sb1, etc)
      if (f.format_id && /^sb\d+/.test(f.format_id)) continue;

      if (f.format_note && (f.format_note.includes('storyboard') || f.format_note.includes('default'))) continue;

      // Skip audio-only formats for the video resolution list (we handle audio separately)
      if (f.vcodec === 'none') continue;

      const height = f.height;
      if (!height || height < 144) continue; // Skip extremely low res or unknown

      const existing = uniqueFormats.get(height);

      // Logic to pick 'best' for this resolution:
      // 1. Prefer MP4 over others
      // 2. Prefer higher bitrate (tbr) if both are MP4 or both not MP4
      const isMp4 = f.ext === 'mp4';
      const existingIsMp4 = existing ? existing.ext === 'mp4' : false;

      if (!existing) {
        uniqueFormats.set(height, f);
      } else if (isMp4 && !existingIsMp4) {
        uniqueFormats.set(height, f); // Upgrade to MP4
      } else if (isMp4 === existingIsMp4) {
        // If protocols match (both mp4 or both not), check bitrate/filesize
        const savedSize = existing.filesize || existing.filesize_approx || 0;
        const newSize = f.filesize || f.filesize_approx || 0;
        if (newSize > savedSize) {
          uniqueFormats.set(height, f);
        }
      }
    }

    // Convert map to array and sort descending by height
    const formats = Array.from(uniqueFormats.values())
      .sort((a, b) => b.height - a.height)
      .map(f => ({
        format_id: f.format_id,
        ext: f.ext,
        quality: `${f.height}p${f.height >= 2160 ? ' 4K' : ''}${f.height >= 1440 ? ' 2K' : ''}${f.height === 1080 ? ' HD' : ''}`,
        filesize: f.filesize || f.filesize_approx || null,
        acodec: f.acodec,
        vcodec: f.vcodec,
        url: f.url || null,
        note: f.format_note
      }));

    // تحسين منطق اختيار رابط المعاينة - يفضل الصيغ التي تحتوي على فيديو وصوت معًا
    let preview_url = null;
    for (const f of formats) {
      if (f.url && (f.ext === 'mp4' || f.ext === 'webm') && f.vcodec !== 'none' && f.acodec !== 'none') {
        // pick first with url that has both video and audio
        preview_url = f.url;
        break;
      }
    }
    // if no format with both video and audio, try any video format
    if (!preview_url) {
      for (const f of formats) {
        if (f.url && (f.ext === 'mp4' || f.ext === 'webm') && f.vcodec !== 'none') {
          preview_url = f.url;
          break;
        }
      }
    }
    // fallback: if no direct url found, preview_url stays null, client will use thumbnail

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      views: info.view_count || 0,
      formats,
      preview_url,
    });
  } catch (e) {
    console.error('Preview error:', e);
    // include warnings from yt-dlp in error for debugging (but return as string)
    res.status(500).json({ error: String(e) });
  }
});

/**
 * Start download record (does NOT spawn process yet).
 * Body: { url, format, type }  -> returns { id, filename }
 * Then frontend should open /api/stream/:id to start actual streaming download (so we can attach progress and streaming to same process).
 */
app.post('/api/start-download', async (req, res) => {
  const { url, format, type, info: providedInfo } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  try {
    let info = providedInfo;
    if (!info) {
      info = await getInfo(url);
    }

    const title = info.title || 'video';
    const safeTitle = safeFilename(title);
    const id = genId();
    downloads[id] = {
      id,
      params: { url, format, type },
      proc: null,
      emitter: new EventEmitter(),
      status: 'created',
      filename: `${safeTitle}.${type === 'audio' ? 'mp3' : 'mp4'}`,
      createdAt: Date.now(),
      info,
    };
    // set max listeners safety
    downloads[id].emitter.setMaxListeners(50);
    res.json({ id, filename: downloads[id].filename, title });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/**
 * SSE endpoint for progress/events:
 * GET /api/events/:id
 * sends JSON events lines with event: message (data: JSON)
 */
app.get('/api/events/:id', (req, res) => {
  const id = req.params.id;
  const item = downloads[id];
  if (!item) return res.status(404).send('Not found');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (payload) => {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      // ignore
    }
  };

  // send initial state
  send({ status: item.status });

  const onEvent = (data) => send(data);
  item.emitter.on('progress', onEvent);
  item.emitter.on('status', onEvent);

  // cleanup on close
  req.on('close', () => {
    try {
      item.emitter.off('progress', onEvent);
      item.emitter.off('status', onEvent);
    } catch (e) { }
  });
});

app.get('/api/stream/:id', async (req, res) => {
  const id = req.params.id;
  const item = downloads[id];
  if (!item) return res.status(404).send('Not found');

  if (item.proc) {
    return res.status(409).send('Download already in progress');
  }

  try {
    const { url, format, type } = item.params;
    const info = item.info;

    let chosenFormat;
    if (type === 'audio') {
      chosenFormat = 'bestaudio';
    } else if (format) {
      const f = (info.formats || []).find(x => x.format_id == format);
      if (f && f.vcodec !== 'none' && f.acodec === 'none') {
        chosenFormat = `${format}+bestaudio`;
      } else {
        chosenFormat = format;
      }
    } else {
      chosenFormat = 'bestvideo+bestaudio/best';
    }

    const intExt = type === 'audio' ? 'mp3' : 'mp4';
    const safeTitle = safeFilename(info.title || 'video');

    // Determine Quality Label
    let qualityLabel = '';
    if (type !== 'audio' && format) {
      // Try to find resolution
      const fmtObj = (info.formats || []).find(f => f.format_id == format);
      if (fmtObj && fmtObj.height) {
        qualityLabel = ` - ${fmtObj.height}p`;
      }
    }

    // Save to temp folder with ID to avoid collisions
    const tempFilename = `${id}_${safeTitle}.${intExt}`;
    const filePath = path.join(TEMP_DIR, tempFilename);

    item.filePath = filePath;
    item.finalFilename = `${safeTitle}${qualityLabel}.${intExt}`; // Name given to user

    // Args: output to specific file, newline for progress
    // Note: 'merger' needs ffmpeg installed
    const args = ['-f', chosenFormat, '-o', filePath, '--no-playlist', '--newline'];
    if (type === 'audio') {
      args.push('--extract-audio', '--audio-format', 'mp3');
    } else {
      args.push('--merge-output-format', 'mp4');
    }
    // Use android_creator to match listing
    if (fs.existsSync(path.join(process.cwd(), 'cookies.txt'))) {
      args.push('--cookies', path.join(process.cwd(), 'cookies.txt'));
    }
    args.push('--js-runtimes', 'node');
    args.push('--force-ipv4');
    args.push(url);

    // Save args for resume
    item.args = args;

    startDownloadProcess(item);

    // Respond to the "start stream" request immediately so client knows it started
    // The client will listen to SSE for completion
    res.json({ ok: true, message: 'Download started on server' });
  } catch (error) {
    console.error('Server download error:', error);
    item.status = 'failed';
    item.emitter.emit('status', { status: 'failed', error: String(error) });
    if (!res.headersSent) res.status(500).send('Internal Server Error');
  }
});

function startDownloadProcess(item) {
  const { id, args } = item;
  console.log(`[${id}] Spawning yt-dlp with args:`, args.join(' '));

  const proc = spawn(ytDlpExe, args);
  item.proc = proc;
  item.status = 'downloading';
  item.emitter.emit('status', { status: 'downloading' });

  proc.stderr.on('data', (chunk) => {
    const txt = chunk.toString();
    if (txt.includes('ERROR:') || txt.includes('Traceback')) {
      console.error(`[${id}] yt-dlp error: ${txt}`);
      item.emitter.emit('status', { status: 'failed', error: txt });
    }

    const lines = txt.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const percentMatch = line.match(/(\d{1,3}\.\d+|\d{1,3})%/);
      const sizeMatch = line.match(/of\s+([0-9\.]+)([KMG]i?B)/i);
      const speedMatch = line.match(/at\s+([0-9\.]+[KMG]i?B\/s)/i);
      const etaMatch = line.match(/ETA\s+([0-9:]+)/i) || line.match(/in\s+([0-9:]+)/i);

      const progress = {};
      if (percentMatch) progress.percent = Number(percentMatch[1]);
      if (sizeMatch) progress.total = `${sizeMatch[1]}${sizeMatch[2]}`;
      if (speedMatch) progress.speed = speedMatch[1];
      if (etaMatch) progress.eta = etaMatch[1];

      if (Object.keys(progress).length > 0) {
        item.emitter.emit('progress', { ...progress, status: 'downloading' });
      }
    }
  });

  proc.on('close', (code) => {
    // If manually killed for pause/stop, status might be different, so check
    if (item.status === 'paused' || item.status === 'stopped') return;

    if (code === 0) {
      item.status = 'finished';
      item.emitter.emit('status', { status: 'finished', downloadUrl: `/api/file/${id}` });

      // Auto-delete
      setTimeout(() => {
        if (item.filePath && fs.existsSync(item.filePath)) try { fs.unlinkSync(item.filePath); } catch (e) { }
        delete downloads[id];
      }, 1000 * 60 * 10);
    } else {
      item.status = 'failed';
      item.emitter.emit('status', { status: 'failed', code });
    }
  });

  proc.on('error', (err) => {
    if (item.status === 'paused' || item.status === 'stopped') return;
    item.status = 'failed';
    item.emitter.emit('status', { status: 'failed', error: String(err) });
  });
}

/**
 * Serve the completed file
 * GET /api/file/:id
 */
app.get('/api/file/:id', (req, res) => {
  const id = req.params.id;
  const item = downloads[id];

  if (!item || !item.filePath || !fs.existsSync(item.filePath)) {
    return res.status(404).send('File not found or expired');
  }

  const { finalFilename } = item;
  res.download(item.filePath, finalFilename, (err) => { });
});


/**
 * Control endpoint: pause / resume / stop
 * POST /api/control/:id  body: { action: 'pause'|'resume'|'stop' }
 */
app.post('/api/control/:id', (req, res) => {
  const id = req.params.id;
  const { action } = req.body;
  const item = downloads[id];
  if (!item) return res.status(404).json({ error: 'Not found' });

  try {
    if (action === 'pause') {
      if (item.proc) {
        item.status = 'paused'; // Set status BEFORE kill so safe close handler sees it
        item.emitter.emit('status', { status: 'paused' });
        item.proc.kill(); // Kill process
        item.proc = null;
      }
      return res.json({ ok: true });
    } else if (action === 'resume') {
      if (item.status === 'paused') {
        startDownloadProcess(item); // RESPAWN with saved args
        return res.json({ ok: true });
      } else {
        return res.status(400).json({ error: 'Not paused' });
      }
    } else if (action === 'stop') {
      item.status = 'stopped';
      item.emitter.emit('status', { status: 'stopped' });
      if (item.proc) {
        item.proc.kill();
        item.proc = null;
      }
      if (item.filePath && fs.existsSync(item.filePath)) {
        try { fs.unlinkSync(item.filePath); } catch (e) { }
      }
      return res.json({ ok: true });
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

/**
 * Legacy download endpoint (kept for compatibility, but note: no progress, may suffer same issues)
 * GET /api/download?url=...&format=...&type=
 * We'll keep it but recommend using the start+stream approach for progress.
 */
app.get('/api/download', async (req, res) => {
  const url = req.query.url;
  const format = req.query.format;
  const type = req.query.type || 'video';

  if (!url) return res.status(400).send('Missing url');

  try {
    const info = await getInfo(url);
    const safeTitle = safeFilename(info.title || 'video');

    let chosenFormat;
    if (type === 'audio') {
      chosenFormat = 'bestaudio';
    } else if (format) {
      const f = (info.formats || []).find(x => x.format_id == format);
      if (f && f.vcodec !== 'none' && f.acodec === 'none') {
        chosenFormat = `${format}+bestaudio`;
      } else {
        chosenFormat = format;
      }
    } else {
      chosenFormat = 'bestvideo+bestaudio/best';
    }

    const ext = type === 'audio' ? 'mp3' : 'mp4';
    const mime = type === 'audio' ? 'audio/mpeg' : 'video/mp4';
    const safeName = `${safeTitle}.${ext}`;

    // Ensure filename is properly encoded for headers
    const encodedFilename = encodeURIComponent(safeName).replace(/['()]/g, escape).replace(/\*/g, '%2A');

    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Type', mime);

    const args = ['-f', chosenFormat, '-o', '-', '--no-playlist', url];
    // Use local binary
    const proc = spawn(ytDlpExe, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.pipe(res);
    proc.stderr.on('data', d => console.error('yt-dlp:', d.toString()));

    req.on('close', () => {
      try { proc.kill(); } catch (e) { }
    });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

/**
 * Serve Static Frontend (Production)
 */
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA Fallback
  app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});
}

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Temp dir: ${TEMP_DIR}`);
  console.log(`yt-dlp path: ${ytDlpExe}`);
});