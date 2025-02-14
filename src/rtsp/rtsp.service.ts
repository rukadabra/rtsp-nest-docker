import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ChildProcessWithoutNullStreams } from 'child_process';

@Injectable()
export class RtspService {
  private hlsOutputPath = path.join(process.cwd(), 'hls');
  private ffmpegProcess: ChildProcessWithoutNullStreams | null | void = null;

  startHlsStream(rtspUrl: string) {
    fs.ensureDirSync(this.hlsOutputPath);

    this.ffmpegProcess = ffmpeg(rtspUrl)
      .outputOptions([
        '-preset veryfast',
        '-g 25',
        '-sc_threshold 0',
        '-f hls',
        '-hls_time 2',
        '-hls_list_size 5',
        '-hls_flags delete_segments',
      ])
      .output(path.join(this.hlsOutputPath, 'stream.m3u8'))
      .on('start', () => console.log(`HLS stream started ${rtspUrl}`))
      .on('error', (err) => {
        console.error(`HLS stream error ${err}`);
        this.ffmpegProcess = null;
      })
      .on('end', () => {
        console.log(`HLS stream ended`);
        this.ffmpegProcess = null;
      })
      .run();
    console.log(
      '🚀 ~ RtspService ~ startHlsStream ~ this.hlsOutputPath:',
      this.hlsOutputPath,
    );
  }

  stopHlsStream() {
    if (this.ffmpegProcess) {
      console.log('stopping ffmpeg process');
      this.ffmpegProcess.kill('SIGINT');
      this.ffmpegProcess = null;
    } else {
      console.log('no active stream');
    }

    fs.emptyDirSync(this.hlsOutputPath);
    console.log('HSL streaming stopped and output cleaned');
  }
}
