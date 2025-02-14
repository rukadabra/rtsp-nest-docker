import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ChildProcessWithoutNullStreams } from 'child_process';

@Injectable()
export class RtspService {
  private hlsOutputPath = path.join(process.cwd(), 'hls');
  private ffmpegProcesses: Map<string, ChildProcessWithoutNullStreams> = new Map();

  startHlsStream(rtspUrl: string) {
    if (this.ffmpegProcesses.has(rtspUrl)) {
      console.log(`Stream for ${rtspUrl} is already running.`);
      return { message: 'Stream already running', fileName: null };
    }

    fs.ensureDirSync(this.hlsOutputPath);

    const fileName = `stream-${Date.now()}.m3u8`;
    const outputPath = path.join(this.hlsOutputPath, fileName);

    const ffmpegProcesses = ffmpeg(rtspUrl)
      .outputOptions([
        // '-preset veryfast',
        // '-g 25',
        // '-sc_threshold 0',
        // '-f hls',
        // '-hls_time 4',
        // '-hls_list_size 10',
        // '-hls_flags delete_segments+independent_segments',
        // '-hls_segment_type mpegts',
        // '-c:v libx264',
        // '-c:a aac',
        // '-b:v 1000k',
        // '-b:a 128k',
        //#CONFIG 2
        // '-preset veryfast', // Fast encoding to reduce latency
        // '-g 50', // Larger GOP for better stability
        // '-sc_threshold 0', // Disable scene change detection
        // '-f hls',
        // '-hls_time 4', // 4-second segments for smoother playback
        // '-hls_list_size 10', // Keep 10 segments in the playlist
        // '-hls_flags delete_segments+independent_segments', // Keyframe alignment and cleanup
        // '-hls_segment_type mpegts', // Use .ts segments
        // '-c:v libx264', // Transcode video to H.264
        // '-c:a aac', // Transcode audio to AAC
        // '-b:v 1000k', // Set video bitrate
        // '-b:a 128k' // Set audio bitrate 
        '-rtsp_transport tcp',
        '-buffer_size 2000k',
        '-analyzeduration 10000000',
        '-probesize 5000000',
        '-max_delay 500000',
        '-fflags +genpts',
        '-flags +low_delay',
        '-strict experimental',
        '-preset veryfast',
        '-g 50',
        '-sc_threshold 0',
        '-f hls',
        '-hls_time 4',
        '-hls_list_size 10',
        '-hls_flags delete_segments+independent_segments',
        '-hls_segment_type mpegts',
        '-c:v libx264',
        '-c:a aac',
        '-b:v 1000k',
        '-b:a 128k'
      ])
      .output(outputPath)
      .on('start', () => console.log(`HLS stream started for ${rtspUrl} -> ${fileName}`))
      .on('error', (err) => {
        console.error(`HLS stream error for ${rtspUrl}: ${err.message}`);
        this.ffmpegProcesses.delete(rtspUrl);
      })
      .on('end', () => {
        console.log(`HLS stream ended for ${rtspUrl}`);
        this.ffmpegProcesses.delete(rtspUrl);
      })
      .run() as unknown as ChildProcessWithoutNullStreams;

    this.ffmpegProcesses.set(rtspUrl, ffmpegProcesses);

    console.log(`🚀 Stream output path: ${outputPath}`);
    return { message: 'Stream started', fileName, url: `/hls/${fileName}` };
  }

  stopHlsStream(rtspUrl: string) {
    const ffmpegProcess = this.ffmpegProcesses.get(rtspUrl);
    if (ffmpegProcess) {
      console.log(`Stopping stream for ${rtspUrl}...`);
      ffmpegProcess.kill('SIGINT');
      this.ffmpegProcesses.delete(rtspUrl);

      console.log(`Stream for ${rtspUrl} stopped.`);
    } else {
      console.log(`No active stream found for ${rtspUrl}.`);
    }
  }

  stopAllStreams() {
    console.log('Stopping all active streams...');
    for (const [rtspUrl, process] of this.ffmpegProcesses.entries()) {
      process.kill('SIGINT');
      console.log(`Stream for ${rtspUrl} stopped.`);
    }
    this.ffmpegProcesses.clear();
    console.log('All streams stopped.');
  }
}
