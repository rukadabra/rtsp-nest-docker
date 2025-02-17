import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ChildProcessWithoutNullStreams } from 'child_process';

@Injectable()
export class RtspService {
  private hlsOutputPath = path.join(process.cwd(), 'hls');
  private ffmpegProcesses: Map<string, ChildProcessWithoutNullStreams> =
    new Map();
  private retryDelays: Map<string, number> = new Map(); // Keeps track of retry delays for each stream

  startHlsStream(rtspUrl: { url: string; id: string; project: string }) {
    if (this.ffmpegProcesses.has(`${rtspUrl.project}-${rtspUrl.id}`)) {
      console.log(
        `Stream for ${rtspUrl.project}-${rtspUrl.id} is already running.`,
      );
      return {
        message: 'Stream already running',
        fileName: `${rtspUrl.project}-${rtspUrl.id}`,
      };
    }

    // Ensure the directory is empty before starting a new stream
    fs.emptyDirSync(this.hlsOutputPath);
    fs.ensureDirSync(this.hlsOutputPath);

    const fileName = `stream-${rtspUrl.project}-${rtspUrl.id}.m3u8`;
    const outputPath = path.join(this.hlsOutputPath, fileName);

    const ffmpegProcesses = ffmpeg(rtspUrl.url)
      // .inputOptions([
      //   '-rtsp_transport tcp',  // Use TCP for more stable streaming
      //   '-analyzeduration 1000000', // Reduce delay in analysis
      //   '-probesize 1000000'  // Faster detection of input format
      // ])
      // .outputOptions([
      //   '-buffer_size 2000k',
      //   '-max_delay 500000',
      //   '-fflags +genpts',
      //   '-flags +low_delay',
      //   '-strict experimental',
      //   '-preset veryfast',
      //   '-g 50',
      //   '-sc_threshold 0',
      //   '-f hls',
      //   '-hls_time 4',
      //   '-hls_list_size 10',
      //   '-hls_flags delete_segments+independent_segments',
      //   '-hls_segment_type mpegts',
      //   '-c:v libx264',
      //   '-c:a aac',
      //   '-b:v 1000k',
      //   '-b:a 128k'
      // ])
      .inputOptions([
        '-rtsp_transport tcp', // Use TCP for stable connection
        '-analyzeduration 1000000', // Reduce analysis delay
        '-probesize 1000000', // Faster detection of input format
        '-fflags nobuffer', // Reduce latency & prevent buffer overflows
        '-flags low_delay', // Prioritize low latency
        '-strict experimental',
        '-thread_queue_size 512', // Queue size to handle frame drops
        '-fflags +genpts', // Generate presentation timestamps (fixes async)
      ])
      .outputOptions([
        '-buffer_size 4000k', // Increase buffer to prevent stuttering
        '-max_delay 300000', // Lower delay for smoother playback
        '-preset ultrafast', // Optimize for lower CPU usage
        '-tune zerolatency', // Reduce latency & improve streaming stability
        '-g 50', // Keyframe interval (balance quality & latency)
        '-sc_threshold 0', // Disable scene change detection (prevents random glitches)
        '-f hls',
        '-hls_time 4',
        '-hls_list_size 10',
        '-hls_flags delete_segments+independent_segments',
        '-hls_segment_type mpegts',
        '-c:v libx264',
        '-crf 23', // Constant Rate Factor (CRF) for better quality control
        '-c:a aac',
        '-b:v 1000k',
        '-b:a 128k',
        '-max_muxing_queue_size 1024', // Prevents buffer underruns
      ])
      .output(outputPath)
      .on('start', () => {
        console.log(`HLS stream started for ${rtspUrl.project}-${rtspUrl.id}`);
        this.retryDelays.set(`${rtspUrl.project}-${rtspUrl.id}`, 0); // Reset retry delay on successful start
      })
      .on('stderr', (stderrLine) => {
        if (
          stderrLine.includes('Non-monotonous DTS') ||
          stderrLine.includes('error while decoding frame')
        ) {
          console.log(
            `⚠️ Detected error for ${rtspUrl.project}-${rtspUrl.id}. Attempting to recover...`,
          );
          this.bufferAndReconnect(rtspUrl);
        }
      })
      .on('error', (err) => {
        console.error(
          `Stream error for ${rtspUrl.project}-${rtspUrl.id}: ${err.message}`,
        );
        this.bufferAndReconnect(rtspUrl);
      })
      .on('end', () => {
        console.log(`HLS stream ended for ${rtspUrl.project}-${rtspUrl.id}`);
        // Auto Re-run 
        this.bufferAndReconnect(rtspUrl);
        // this.ffmpegProcesses.delete(`${rtspUrl.project}-${rtspUrl.id}`);
      })
      .run() as unknown as ChildProcessWithoutNullStreams;

    this.ffmpegProcesses.set(
      `${rtspUrl.project}-${rtspUrl.id}`,
      ffmpegProcesses,
    );

    return { message: 'Stream started', fileName, url: `/hls/${fileName}` };
  }

  stopHlsStream(id: string) {
    const ffmpegProcess = this.ffmpegProcesses.get(id);
    if (ffmpegProcess) {
      console.log(`Stopping stream for ${id}...`);
      ffmpegProcess.kill('SIGINT');
      this.ffmpegProcesses.delete(id);

      console.log(`Stream for ${id} stopped.`);
    } else {
      console.log(`No active stream found for ${id}.`);
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

  private bufferAndReconnect(rtspUrl: {
    url: string;
    id: string;
    project: string;
  }) {
    const retryDelay =
      this.retryDelays.get(`${rtspUrl.project}-${rtspUrl.id}`) || 1000; // Initial delay of 1 second

    console.log(
      `Buffering... Will retry in ${retryDelay / 1000} seconds for ${rtspUrl.project}-${rtspUrl.id}`,
    );

    setTimeout(() => {
      this.stopHlsStream(`${rtspUrl.project}-${rtspUrl.id}`); // Stop the current process
      console.log(`Reconnecting to ${rtspUrl.project}-${rtspUrl.id}...`);
      this.startHlsStream(rtspUrl); // Restart the stream
      const nextDelay = Math.min(retryDelay * 2, 10000); // Increase delay up to a max of 10 seconds
      this.retryDelays.set(`${rtspUrl.project}-${rtspUrl.id}`, nextDelay);
    }, retryDelay);
  }
}
