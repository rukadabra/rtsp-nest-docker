import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ChildProcessWithoutNullStreams } from 'child_process';

@Injectable()
export class RtspService {
  private hlsOutputPath = path.join(process.cwd(), 'hls');
  private ffmpegProcesses: Map<string, ChildProcessWithoutNullStreams> = new Map();
  private retryDelays: Map<string, number> = new Map();
  private manuallyStoppedStreams: Set<string> = new Set(); // ✅ Manual stop tracker

  // 🔹 Start individual RTSP -> HLS stream
  startHlsStream(rtspUrl: { url: string; id: string; project: string }) {
    const key = `${rtspUrl.project}-${rtspUrl.id}`;
    if (this.ffmpegProcesses.has(key)) {
      return { message: 'Stream already running', fileName: `stream-${key}.m3u8` };
    }
    if (this.manuallyStoppedStreams.has(key)) {
      return { message: 'Stream was manually stopped. Resume it manually.' };
    }

    fs.ensureDirSync(this.hlsOutputPath);
    const fileName = `stream-${key}.m3u8`;
    const outputPath = path.join(this.hlsOutputPath, fileName);

    const ffmpegProcess = ffmpeg(rtspUrl.url)
      .inputOptions([
        '-rtsp_transport', 'tcp',
        '-analyzeduration', '1000000',
        '-probesize', '1000000',
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-strict', 'experimental',
        '-thread_queue_size', '512',
        '-fflags', '+genpts',
      ])
      .outputOptions([
        '-buffer_size', '4000k',
        '-max_delay', '300000',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-g', '50',
        '-sc_threshold', '0',
        '-f', 'hls',
        '-hls_time', '4',
        '-hls_list_size', '10',
        '-hls_flags', 'delete_segments+independent_segments',
        '-hls_segment_type', 'mpegts',
        '-c:v', 'libx264',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:v', '1000k',
        '-b:a', '128k',
        '-max_muxing_queue_size', '1024',
      ])
      .output(outputPath)
      .on('start', () => this.retryDelays.set(key, 0))
      .on('stderr', (line) => {
        if (line.includes('Non-monotonous DTS') || line.includes('error while decoding')) {
          this.bufferAndReconnect(rtspUrl);
        }
      })
      .on('error', () => this.bufferAndReconnect(rtspUrl))
      .on('end', () => this.bufferAndReconnect(rtspUrl))
      .run() as unknown as ChildProcessWithoutNullStreams;

    this.ffmpegProcesses.set(key, ffmpegProcess);
    return { message: 'Stream started', fileName, url: `/hls/${fileName}` };
  }

  // 🔹 Start combined RTSP -> HLS (2 or 4 camera view)
  async startCombinedHlsStream(rtspList: {
    urls: Array<{ url: string; rotate?: number }>;
    id: string;
    project: string;
  }) {
    const key = `${rtspList.project}-${rtspList.id}`;
    if (this.ffmpegProcesses.has(key)) {
      return { message: 'Combined stream already running', fileName: `stream-${key}.m3u8` };
    }
    if (this.manuallyStoppedStreams.has(key)) {
      return { message: 'Combined stream was manually stopped. Resume it manually.' };
    }

    fs.ensureDirSync(this.hlsOutputPath);
    const fileName = `stream-${key}.m3u8`;
    const outputPath = path.join(this.hlsOutputPath, fileName);

    const command = ffmpeg();

    try {
      const inputCount = rtspList.urls.length;
      if (inputCount < 2 || inputCount > 9) {
        throw new Error('Only 2 to 9 RTSP inputs are supported');
      }

      rtspList.urls.forEach(({ url }) => {
        command.input(url).inputOptions([
          '-rtsp_transport', 'tcp',
          '-fflags', 'nobuffer',
          '-flags', 'low_delay',
          '-thread_queue_size', '512',
        ]);
      });

      const cols = Math.ceil(Math.sqrt(inputCount));
      const rows = Math.ceil(inputCount / cols);

      const tileWidth = Math.floor(1920 / cols);
      const tileHeight = Math.floor(1080 / rows);

      // Filters
      const processedLabels = rtspList.urls.map((_, i) => `[v${i}]`);
      const filters = rtspList.urls
        .map(({ rotate }, i) => {
          let label = `[${i}:v]`;
          let rotationFilter = '';

          switch (rotate) {
            case 90:
              rotationFilter = 'transpose=1';
              break;
            case 180:
              rotationFilter = 'transpose=1,transpose=1';
              break;
            case 270:
              rotationFilter = 'transpose=2';
              break;
            default:
              rotationFilter = '';
          }

          const filters = [
            rotationFilter,
            `scale=${tileWidth}:${tileHeight}`,
          ].filter(Boolean).join(',');

          return `${label}${filters ? filters + `[v${i}]` : `scale=${tileWidth}:${tileHeight}[v${i}]`}`;
        })
        .join('; ');

      // Layout grid
      const layout = rtspList.urls.map((_, i) => {
        const x = (i % cols) * tileWidth;
        const y = Math.floor(i / cols) * tileHeight;
        return `${x}_${y}`;
      }).join('|');

      const xstack = `${processedLabels.join('')}xstack=inputs=${inputCount}:layout=${layout}[outv]`;
      const filter = `${filters}; ${xstack}`;

      const process = command
        .complexFilter(filter)
        .outputOptions([
          '-map', '[outv]',
          '-c:v', 'libx264',
          '-crf', '23',
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-f', 'hls',
          '-hls_time', '4',
          '-hls_list_size', '10',
          '-hls_flags', 'delete_segments+independent_segments',
          '-hls_segment_type', 'mpegts',
        ])
        .output(outputPath)
        .on('start', () => {
          console.log(`🎬 Starting combined stream ${key}`);
          this.retryDelays.set(key, 0);
        })
        .on('stderr', (line) => {
          console.log(`[ffmpeg stderr ${key}]`, line);
          if (line.toLowerCase().includes('error')) {
            this.bufferAndReconnectCombined(rtspList);
          }
        })
        .on('error', (err) => {
          console.error(`🔥 FFmpeg error for ${key}:`, err.message);
          this.bufferAndReconnectCombined(rtspList);
        })
        .on('end', () => {
          console.log(`✅ Combined stream ended for ${key}`);
          this.bufferAndReconnectCombined(rtspList);
        })
        .run() as unknown as ChildProcessWithoutNullStreams;

      this.ffmpegProcesses.set(key, process);
      return { message: 'Combined stream started', fileName, url: `/hls/${fileName}` };

    } catch (err) {
      console.error(`❌ Failed to start combined stream for ${key}:`, err.message);
      return { message: 'Error', error: err.message };
    }
  }


  // 🔹 Stop single stream
  stopHlsStream(id: string) {
    const process = this.ffmpegProcesses.get(id);
    if (process) {
      process.kill('SIGINT');
      this.ffmpegProcesses.delete(id);
      this.manuallyStoppedStreams.add(id); // ✅ Prevent restart
    }
  }

  // 🔹 Resume single stream
  resumeStream(rtspUrl: { url: string; id: string; project: string }) {
    const key = `${rtspUrl.project}-${rtspUrl.id}`;
    this.manuallyStoppedStreams.delete(key); // ✅ Allow restart
    return this.startHlsStream(rtspUrl);
  }

  // 🔹 Resume combined stream
  resumeCombinedStream(rtspList: { urls: Array<{ url: string; rotate?: number }>; id: string; project: string }) {
    const key = `${rtspList.project}-${rtspList.id}`;
    this.manuallyStoppedStreams.delete(key);
    return this.startCombinedHlsStream(rtspList);
  }

  // 🔹 Stop all
  stopAllStreams() {
    for (const [id, proc] of this.ffmpegProcesses.entries()) {
      proc.kill('SIGINT');
      this.manuallyStoppedStreams.add(id);
    }
    this.ffmpegProcesses.clear();
  }

  // 🔁 Reconnect for single
  private bufferAndReconnect(rtspUrl: { url: string; id: string; project: string }) {
    const key = `${rtspUrl.project}-${rtspUrl.id}`;
    if (this.manuallyStoppedStreams.has(key)) return;

    const delay = this.retryDelays.get(key) || 1000;
    setTimeout(() => {
      this.stopHlsStream(key);
      this.startHlsStream(rtspUrl);
      this.retryDelays.set(key, Math.min(delay * 2, 10000));
    }, delay);
  }

  // 🔁 Reconnect for combined
  private bufferAndReconnectCombined(rtspList: { urls: Array<{ url: string; rotate?: number }>; id: string; project: string }) {
    const key = `${rtspList.project}-${rtspList.id}`;
    if (this.manuallyStoppedStreams.has(key)) return;

    const delay = this.retryDelays.get(key) || 1000;
    setTimeout(() => {
      this.stopHlsStream(key);
      this.startCombinedHlsStream(rtspList);
      this.retryDelays.set(key, Math.min(delay * 2, 10000));
    }, delay);
  }
}
