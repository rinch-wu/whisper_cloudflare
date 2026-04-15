import { extractAudioBytes } from './lib/audio.mjs';

export default {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname === '/') {
        return new Response(renderHTMLPage(), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          }
        });
      }
  
      if (url.pathname === '/fetch-transcribe') {
        return handleFetchAndTranscribe(request, env);
      }

      if (request.method !== 'POST') {
        return new Response('Only POST method is supported', { status: 405 });
      }
  
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('application/octet-stream')) {
        return new Response('Invalid content type. Use application/octet-stream.', { status: 400 });
      }
  
      // 解析 query 参数
      const task = url.searchParams.get('task') || 'transcribe'; 
      // translate
      const language = url.searchParams.get('language') || null;
      const vad_filter = url.searchParams.get('vad_filter') === 'true';
      const initial_prompt = url.searchParams.get('initial_prompt') || null;
      const prefix = url.searchParams.get('prefix') || null;
  
      const blob = await request.arrayBuffer();
  
      const inputs = {
        audio: arrayBufferToBase64(blob),
        task,
        vad_filter,
      };
  
      if (language) inputs.language = language;
      if (initial_prompt) inputs.initial_prompt = initial_prompt;
      if (prefix) inputs.prefix = prefix;
  
      let aiResponse;
      try {
        aiResponse = await env.AI.run("@cf/openai/whisper-large-v3-turbo", inputs);
      } catch (e) {
        console.error(e);
        return Response.json({ error: "An unexpected error occurred: " + e });
      }
  
      if (url.pathname === '/raw') {
        return Response.json({ response: aiResponse });
      }
  
      if (url.pathname === '/srt') {
        const segments = aiResponse.segments || [];
        const srt = convertWordsToSRT(segments);
        return new Response(srt, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': 'inline; filename="subtitles.srt"'
          }
        });
      }
  
      return new Response('Not Found', { status: 404 });
    }
  };
  
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  function convertWordsToSRT(segments) {
    if (!Array.isArray(segments) || segments.length === 0) {
      return 'No transcription data.';
    }
  
    let srt = '';
    let index = 1;
    const LF = String.fromCharCode(10);
  
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const start = formatSRTTime(segment.start);
      const end = formatSRTTime(segment.end);
      srt += index + LF + start + ' --> ' + end + LF + segment.text + LF + LF;
      index++;
    }
  
    return srt;
  }
  
  function formatSRTTime(seconds) {
    const ms = Math.floor((seconds % 1) * 1000);
    const s = Math.floor(seconds) % 60;
    const m = Math.floor(seconds / 60) % 60;
    const h = Math.floor(seconds / 3600);
  
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
  }
  
  function pad(num, size = 2) {
    return num.toString().padStart(size, '0');
  }
  
  function isChinese(char) {
    return /[\u4e00-\u9fa5]/.test(char);
  }
  function renderHTMLPage() {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Whisper Transcription</title>
  <!-- <link rel="icon" href="https://static.hzchu.top/favicon.ico"> -->
  <style>
    :root {
      --primary-color: #4a90e2;
      --border-radius: 8px;
      --spacing: 20px;
    }

    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: var(--spacing);
      max-width: 800px;
      margin: 0 auto;
      background-color: #f5f7fa;
      color: #333;
      line-height: 1.6;
    }

    h1, h2 {
      color: #2c3e50;
      margin-bottom: var(--spacing);
    }

    form {
      background: white;
      padding: var(--spacing);
      border-radius: var(--border-radius);
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    label {
      display: block;
      margin-top: 15px;
      font-weight: 500;
      color: #4a5568;
    }

    input[type="file"],
    input[type="text"],
    select {
      width: 100%;
      padding: 10px;
      margin: 8px 0;
      border: 1px solid #ddd;
      border-radius: var(--border-radius);
      box-sizing: border-box;
    }

    input[type="checkbox"] {
      margin-right: 8px;
    }

    button {
      background-color: var(--primary-color);
      color: white;
      padding: 12px 20px;
      border: none;
      border-radius: var(--border-radius);
      cursor: pointer;
      font-size: 16px;
      margin-top: 15px;
      transition: background-color 0.3s;
    }

    button:hover {
      background-color: #357abd;
    }

    button:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    textarea {
      width: 100%;
      height: 200px;
      margin-top: 10px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: var(--border-radius);
      box-sizing: border-box;
      font-family: monospace;
      resize: vertical;
    }

    #downloadBtn {
      background-color: #27ae60;
    }

    #downloadBtn:hover {
      background-color: #219a52;
    }

    @media (max-width: 600px) {
      body {
        padding: 10px;
      }
      
      form {
        padding: 15px;
      }
    }

    #progressContainer {
      display: none;
      margin: 20px 0;
      background: #f0f0f0;
      border-radius: var(--border-radius);
      padding: 10px;
      text-align: center;
    }

    .progress-bar {
      width: 100%;
      height: 20px;
      background-color: #ddd;
      border-radius: 10px;
      overflow: hidden;
    }

    .progress {
      width: 0%;
      height: 100%;
      background-color: var(--primary-color);
      transition: width 0.3s ease;
    }

    .progress-text {
      margin-top: 8px;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>音频转写</h1>
  <form id="uploadForm">
    <label>音频文件 (WAV/MP3):</label>
    <input type="file" id="audioFile" accept="audio/*" required />

    <label>任务:</label>
    <select id="task">
      <option value="transcribe">Transcribe</option>
      <option value="translate">Translate</option>
    </select>

    <label>语言 (optional):</label>
    <input type="text" id="language" placeholder="e.g. en, zh, ja" />

    <label>初始提示 (optional):</label>
    <input type="text" id="initial_prompt"  placeholder="以下是普通话句子。"/>

    <label>前缀 (optional):</label>
    <input type="text" id="prefix" />

    <label><input type="checkbox" id="vad_filter" checked />启用VAD过滤</label>

    <button type="submit">提交</button>
  </form>

  <div id="progressContainer">
    <div class="progress-bar">
      <div class="progress" id="progressBar"></div>
    </div>
    <div class="progress-text">处理中... 请稍候</div>
  </div>

  <h2>结果 (SRT):</h2>
  <textarea id="result" readonly></textarea>
  <button id="downloadBtn" disabled>下载SRT</button>
  <script>
    const resultBox = document.getElementById('result');
    const downloadBtn = document.getElementById('downloadBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    let srtContent = '';

    // 将秒数转换为SRT时间格式
    function formatSRTTime(seconds) {
      const ms = Math.floor((seconds % 1) * 1000);
      const s = Math.floor(seconds) % 60;
      const m = Math.floor(seconds / 60) % 60;
      const h = Math.floor(seconds / 3600);

      return pad(h) + ':' + pad(m) + ':' + pad(s) + ',' + pad(ms, 3);
    }

    // 数字补零
    function pad(num, size = 2) {
      return num.toString().padStart(size, '0');
    }
    // 将segments数组转换为SRT格式
    function convertWordsToSRT(segments) {
      if (!Array.isArray(segments) || segments.length === 0) {
        return 'No transcription data.';
      }

      let srt = '';
      let index = 1;
      const LF = String.fromCharCode(10);

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const start = formatSRTTime(segment.start);
        const end = formatSRTTime(segment.end);
        srt += index + LF + start + ' --> ' + end + LF + segment.text + LF + LF;
        index++;
      }

      return srt;
    }

    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const file = document.getElementById('audioFile').files[0];
      if (!file) return alert('Please select a file.');

      // 显示进度条并重置状态
      progressContainer.style.display = 'block';
      progressBar.style.width = '0%';
      resultBox.value = '';
      downloadBtn.disabled = true;

      const task = document.getElementById('task').value;
      const language = document.getElementById('language').value;
      const initial_prompt = document.getElementById('initial_prompt').value;
      const prefix = document.getElementById('prefix').value;
      const vad_filter = document.getElementById('vad_filter').checked;

      const params = new URLSearchParams({
        task,
        ...(language && { language }),
        ...(initial_prompt && { initial_prompt }),
        ...(prefix && { prefix }),
        vad_filter: vad_filter.toString()
      });

      try {
        // 启动进度条动画
        let progress = 0;
        const totalTime = 20000; // 20秒
        const updateInterval = 200; // 每200ms更新一次
        const progressStep = (90 / (totalTime / updateInterval)); // 90%分成100份
        
        const progressInterval = setInterval(() => {
          if (progress < 90) {
            progress += progressStep;
            progressBar.style.width = progress + '%';
          }
        }, updateInterval);

        // 从/raw路由获取数据
        const response = await fetch('/raw?' + params.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: await file.arrayBuffer()
        });

        if (!response.ok) {
          clearInterval(progressInterval);
          const error = await response.text();
          resultBox.value = 'Error: ' + error;
          progressContainer.style.display = 'none';
          return;
        }

        // 解析JSON响应并转换为SRT格式
        const rawData = await response.json();
        
        if (!rawData || !rawData.response || !rawData.response.segments) {
          srtContent = 'No transcription data.';
        } else {
          srtContent = convertWordsToSRT(rawData.response.segments);
        }
        
        // 完成进度条动画
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        setTimeout(() => {
          progressContainer.style.display = 'none';
        }, 500);

        resultBox.value = srtContent;
        downloadBtn.disabled = false;
      } catch (error) {
        progressContainer.style.display = 'none';
        resultBox.value = 'Error: ' + error.message;
        downloadBtn.disabled = true;
      }
    });

    downloadBtn.addEventListener('click', () => {
      // 获取原始文件名，并将扩展名改为.srt
      const originalFileName = document.getElementById('audioFile').files[0].name;
      const srtFileName = originalFileName.replace(/\.[^/.]+$/, '') + '.srt';
      
      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = srtFileName;
      a.click();
      URL.revokeObjectURL(url);
    });
  </script>
</body>
</html>
    `;
  }

function serializeCookies(cookieObj) {
  if (!cookieObj || typeof cookieObj !== 'object') {
    return '';
  }
  return Object.entries(cookieObj)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function buildFetchRequest(requestConfig) {
  const { url, method = 'GET', headers: userHeaders = {}, cookie, data } = requestConfig;

  if (!url) {
    throw new Error('Missing required field: request.url');
  }

  const headers = { ...userHeaders };

  const cookieStr = serializeCookies(cookie);
  if (cookieStr) {
    headers['Cookie'] = cookieStr;
  }

  const init = { method, headers };

  const upperMethod = method.toUpperCase();
  if ((upperMethod === 'POST' || upperMethod === 'PUT') && data !== undefined && data !== null) {
    if (typeof data === 'object') {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(data);
    } else {
      init.body = String(data);
    }
  }

  return fetch(url, init);
}

// extractAudioBytes imported from ./lib/audio.mjs

async function transcribeAudioBuffer(audioArrayBuffer, whisperOptions, env) {
  const { task = 'transcribe', language, vad_filter = false, initial_prompt, prefix } = whisperOptions || {};

  const inputs = {
    audio: arrayBufferToBase64(audioArrayBuffer),
    task,
    vad_filter,
  };

  if (language) inputs.language = language;
  if (initial_prompt) inputs.initial_prompt = initial_prompt;
  if (prefix) inputs.prefix = prefix;

  return env.AI.run("@cf/openai/whisper-large-v3-turbo", inputs);
}

async function handleFetchAndTranscribe(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.request || !body.request.url) {
    return Response.json({ error: 'Missing required field: request.url' }, { status: 400 });
  }

  const whisperOptions = body.whisper || {};

  let fetchResponse;
  try {
    fetchResponse = await buildFetchRequest(body.request);
  } catch (e) {
    return Response.json({ error: 'Failed to fetch audio: ' + e.message }, { status: 502 });
  }

  let audioBuffer;
  try {
    audioBuffer = await extractAudioBytes(fetchResponse);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }

  let aiResponse;
  try {
    aiResponse = await transcribeAudioBuffer(audioBuffer, whisperOptions, env);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Transcription failed: ' + e.message }, { status: 500 });
  }

  return Response.json({
    text: aiResponse.text,
    segments: aiResponse.segments,
  });
}
  