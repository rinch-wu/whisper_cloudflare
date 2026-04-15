# Whisper on Cloudflare AI

一个基于 Whisper 模型的在线音频转写工具，部署在 Cloudflare Workers 上。该工具可以将音频文件转换为文字，并支持生成 SRT 格式的字幕文件。

实例：[https://whisper-cloudflare.rinch-wu.workers.dev/](https://whisper-cloudflare.rinch-wu.workers.dev/)

![index](https://github.com/user-attachments/assets/8818c6e9-8e4e-4cec-802e-16513de9f91e)

## 速度

使用一段时长为 41 分钟 39 秒的音频测试，用时 1.9 分钟。

> 由于 Worker 的资源限制，在使用时可能出现错误，重试即可。

![example](https://github.com/user-attachments/assets/dac563ff-091f-479e-a750-d1f4ab1feafe)

## 模型

使用 `@cf/openai/whisper-large-v3-turbo` 模型，支持多种语言（中文、英文、日文等）的音频转写和翻译。

## API 文档

完整的 API 文档见 **[API.md](./API.md)**。

### 快速参考

| 路由 | 方法 | 说明 |
|------|------|------|
| `/` | GET | Web UI 页面 |
| `/raw` | POST | 上传音频，返回原始转写 JSON |
| `/srt` | POST | 上传音频，返回 SRT 字幕文件 |
| `/fetch-transcribe` | POST | 从 URL 抓取音频并转写 |

### 查询参数（/raw 和 /srt）

| 参数名 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `task` | string | `transcribe` | `transcribe`（转写）或 `translate`（翻译为英文） |
| `language` | string | 自动检测 | 语言代码，如 `zh`、`en`、`ja` |
| `vad_filter` | boolean | `false` | 是否启用 VAD 过滤 |
| `initial_prompt` | string | 无 | 初始提示词 |
| `prefix` | string | 无 | 前缀文本 |

### /fetch-transcribe 请求体

```json
{
  "request": {
    "url": "https://example.com/audio.mp3",
    "method": "GET",
    "headers": { "User-Agent": "Mozilla/5.0" },
    "cookie": { "session": "abc" }
  },
  "whisper": {
    "task": "transcribe",
    "language": "zh",
    "vad_filter": true
  }
}
```

## 支持的音频格式

MP3、WAV、M4A、FLAC、OGG、MP4/M4S（含音轨的视频容器）等。

## 部署

本项目部署在 Cloudflare Workers 上。

```bash
npx wrangler deploy
```

需要配置 `wrangler.toml` 中的 `[ai]` binding。
