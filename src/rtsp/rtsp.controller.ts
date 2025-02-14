import { Controller, Get, Query } from '@nestjs/common';
import { RtspService } from './rtsp.service';

@Controller('rtsp')
export class RtspController {
  constructor(private readonly rtspService: RtspService) {}

  @Get('start')
  startStream(@Query('url') url: string) {
    //need url checker
    this.rtspService.startHlsStream(url);
    return {
      message: `RTSP stream started ${url}`,
      url: '/hls/stream.m3u8',
    };
  }

  @Get('stop')
  stopStream() {
    this.rtspService.stopHlsStream();
    return {
      message: 'RTSP stream stopped',
    };
  }
}
