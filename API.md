# Whisper Cloudflare API 文档

**Base URL**: `https://<your-worker>.<your-subdomain>.workers.dev`

**模型**: `@cf/openai/whisper-large-v3-turbo`

---

## 概览

| 路由 | 方法 | 说明 |
|------|------|------|
| `/` | GET | Web UI 页面 |
| `/raw` | POST | 上传音频，返回原始转写 JSON |
| `/srt` | POST | 上传音频，返回 SRT 字幕文件 |
| `/fetch-transcribe` | POST | 从 URL 抓取音频并转写 |

---

## 1. POST /raw — 原始转写

上传音频文件，返回 Whisper 模型的原始转写结果（JSON）。

### 请求

- **Method**: `POST`
- **Content-Type**: `application/octet-stream`
- **Body**: 音频文件二进制数据（WAV / MP3 / M4S 等）

### Query 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `task` | string | `transcribe` | `transcribe`（原语言转写）或 `translate`（翻译为英文） |
| `language` | string | 自动检测 | 目标语言代码，如 `zh`、`en`、`ja` |
| `vad_filter` | boolean | `false` | 是否启用语音活动检测（VAD）过滤 |
| `initial_prompt` | string | 无 | 初始提示词，引导模型理解语境 |
| `prefix` | string | 无 | 前缀文本，增强上下文理解 |

### 示例

```bash
# 基本转写
curl -X POST "https://<your-worker>.workers.dev/raw" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @audio.mp3

# 指定语言 + VAD 过滤 + 初始提示
curl -X POST "https://<your-worker>.workers.dev/raw?language=zh&vad_filter=true&initial_prompt=以下是普通话句子" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @audio.mp3

# 翻译为英文
curl -X POST "https://<your-worker>.workers.dev/raw?task=translate" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @audio.mp3
```

### 响应

**Status**: `200 OK`

```json
{
  "response": {
    "text": "完整的转写文本内容",
    "segments": [
      {
        "start": 0.0,
        "end": 3.5,
        "text": "第一句话",
        "words": [
          { "word": "第", "start": 0.0, "end": 0.2 },
          { "word": "一", "start": 0.2, "end": 0.4 },
          { "word": "句", "start": 0.4, "end": 0.6 },
          { "word": "话", "start": 0.6, "end": 0.8 }
        ],
        "word_count": 1
      }
    ],
    "temperature": 0,
    "avg_logprob": -0.15,
    "compression_ratio": 1.5,
    "no_speech_prob": 0
  }
}
```

---

## 2. POST /srt — SRT 字幕文件

上传音频文件，直接生成 SRT 格式字幕。

### 请求

- **Method**: `POST`
- **Content-Type**: `application/octet-stream`
- **Body**: 音频文件二进制数据

### Query 参数

与 `/raw` 完全相同（`task`, `language`, `vad_filter`, `initial_prompt`, `prefix`）。

### 示例

```bash
curl -X POST "https://<your-worker>.workers.dev/srt?language=zh&vad_filter=true" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @audio.mp3 \
  -o subtitles.srt
```

### 响应

**Status**: `200 OK`  
**Content-Type**: `text/plain; charset=utf-8`  
**Content-Disposition**: `inline; filename="subtitles.srt"`

```srt
1
00:00:00,000 --> 00:00:03,500
第一句话

2
00:00:04,000 --> 00:00:07,200
第二句话
```

---

## 3. POST /fetch-transcribe — 远程抓取并转写

从指定 URL 下载音频/视频文件，自动完成转写。适合处理 CDN 上的媒体文件。

### 请求

- **Method**: `POST`
- **Content-Type**: `application/json`
- **Body**: JSON 对象

### 请求体结构

```json
{
  "request": {
    "url": "string (必填)",
    "method": "GET | POST | PUT (默认 GET)",
    "headers": { "Header-Name": "value" },
    "cookie": { "key1": "value1", "key2": "value2" },
    "data": "POST 请求体（string 或 object）"
  },
  "whisper": {
    "task": "transcribe | translate (默认 transcribe)",
    "language": "zh | en | ja (可选，自动检测)",
    "vad_filter": true | false (默认 false),
    "initial_prompt": "string (可选)",
    "prefix": "string (可选)"
  }
}
```

### 字段说明

#### request 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | ✅ | 音频/视频文件的 URL |
| `method` | string | ❌ | HTTP 方法，默认 `GET` |
| `headers` | object | ❌ | 自定义请求头 |
| `cookie` | object | ❌ | Cookie 键值对，自动序列化为 `key=value; key2=value2` |
| `data` | string/object | ❌ | POST/PUT 请求体，object 类型会自动转为 JSON |

#### whisper 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task` | string | ❌ | `transcribe`（默认）或 `translate` |
| `language` | string | ❌ | 语言代码，如 `zh` |
| `vad_filter` | boolean | ❌ | 是否启用 VAD 过滤 |
| `initial_prompt` | string | ❌ | 初始提示词 |
| `prefix` | string | ❌ | 前缀文本 |

### 示例

#### 基本用法（公开 URL）

```bash
curl -X POST "https://<your-worker>.workers.dev/fetch-transcribe" \
  -H "Content-Type: application/json" \
  -d '{
    "request": {
      "url": "https://example.com/audio.mp3"
    },
    "whisper": {
      "language": "zh",
      "vad_filter": true
    }
  }'
```

#### 带 Cookie 和自定义 Header（Bilibili CDN）

```bash
curl -X POST "https://<your-worker>.workers.dev/fetch-transcribe" \
  -H "Content-Type: application/json" \
  -d '{
    "request": {
      "url": "https://upos-hz-mirrorakam.akamaized.net/xxx.m4s?xxx",
      "headers": {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.bilibili.com/video/BV1KGDzBLExG"
      }
    },
    "whisper": {
      "task": "transcribe",
      "language": "zh",
      "vad_filter": true
    }
  }'
```

#### 使用 Cookie 字段

```json
{
  "request": {
    "url": "https://example.com/audio.mp3",
    "cookie": {
      "session": "abc123",
      "token": "xyz789"
    }
  }
}
```

Cookie 会被自动序列化为：`session=abc123; token=xyz789`

#### 使用 POST 方法发送数据

```json
{
  "request": {
    "url": "https://api.example.com/generate-audio",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer xxx"
    },
    "data": {
      "text": "Hello world",
      "voice": "default"
    }
  }
}
```

### 响应

**Status**: `200 OK`（成功）/ `400`（请求参数错误）/ `502`（抓取失败）/ `500`（转写失败）

#### 成功响应

```json
{
  "text": "完整的转写文本内容",
  "segments": [
    {
      "start": 0.0,
      "end": 3.5,
      "text": "第一句话",
      "words": [
        { "word": "第", "start": 0.0, "end": 0.2 }
      ],
      "word_count": 1
    }
  ]
}
```

#### 错误响应

```json
// 请求体不是有效 JSON (400)
{ "error": "Invalid JSON body" }

// 缺少 request.url (400)
{ "error": "Missing required field: request.url" }

// 抓取音频失败 (502)
{ "error": "Failed to fetch audio: ..." }

// 响应不是音频类型 (502)
{ "error": "Expected audio/video content but got content-type: text/html" }

// 转写失败 (500)
{ "error": "Transcription failed: ..." }
```

---

## 支持的音频格式

Whisper 模型支持的格式包括但不限于：
- MP3
- WAV
- M4A
- FLAC
- OGG
- MP4 / M4S（含音轨的视频容器）

---

## 限制与注意事项

1. **文件大小**: Cloudflare Workers 有请求体大小限制（通常 ~100MB），超大音频可能失败
2. **超时**: Worker 请求超时时间为 30 秒（CPU 时间），但 AI 模型运行不计入 CPU 时间
3. **重试**: 如遇 500 错误（模型繁忙），可重试
4. **视频文件**: M4S/MP4 等视频容器也可正常转写，Whisper 会自动提取音轨
5. **Cookie**: `/fetch-transcribe` 的 `cookie` 字段使用 JSON 对象 `{ key: value }`，不要用字符串
