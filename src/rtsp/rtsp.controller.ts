import { Controller, Post, Body, Delete, Param, BadRequestException } from '@nestjs/common';
import { RtspService } from './rtsp.service';

@Controller('rtsp')
export class RtspController {
  constructor(private readonly rtspService: RtspService) { }

  @Post('start')
  startStream(@Body() body: { url: string; id: string; project: string }) {
    return this.rtspService.startHlsStream(body);
  }

  @Post('start/batch')
  async startBatchStream(
    @Body() body: { urls: { url: string; id: string; project: string }[] },
  ) {
    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      throw new BadRequestException('No URLs provided for streaming');
    }

    const results = await Promise.all(
      body.urls.map((urlObj) => {
        try {
          const fileName = this.rtspService.startHlsStream(urlObj);
          return {
            // ...urlObj,
            fileName: fileName.fileName,
            streamUrl: fileName.url,
            status: 'success',
          };
        } catch (error) {
          console.error(`Failed to start stream for ${urlObj.url}:`, error);
          return {
            // ...urlObj,
            status: 'error',
            error: error.message,
          };
        }
      }),
    );

    return {
      message: 'Batch processing completed',
      results,
    };
  }

  @Post('start/combined')
  startCombinedStream(@Body() body: { urls: Array<{ url: string; rotate?: number }>; id: string; project: string }) {
    return this.rtspService.startCombinedHlsStream(body);
  }

  @Post('resume')
  resumeStream(@Body() body: { url: string; id: string; project: string }) {
    return this.rtspService.resumeStream(body);
  }

  @Post('resume/batch')
  async resumeBatchStream(@Body() body: { urls: { url: string; id: string; project: string }[] }) {
    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      throw new BadRequestException('No URLs provided for streaming');
    }

    const results = await Promise.all(
      body.urls.map((urlObj) => {
        try {
          const fileName = this.rtspService.resumeStream(urlObj);
          return {
            fileName: fileName.fileName,
            streamUrl: fileName.url,
            status: 'success',
          };
        } catch (error) {
          console.error(`Failed to start stream for ${urlObj.url}:`, error);
          return {
            status: 'error',
            error: error.message,
          };
        }
      }),
    );

    return {
      message: 'Batch processing completed',
      results,
    };
  }

  @Post('resume/combined')
  resumeCombinedStream(@Body() body: { urls: Array<{ url: string; rotate?: number }>; id: string; project: string }) {
    return this.rtspService.resumeCombinedStream(body);
  }

  @Delete('stop/:project/:id')
  stopStream(@Param('project') project: string, @Param('id') id: string) {
    const key = `${project}-${id}`;
    this.rtspService.stopHlsStream(key);
    return { message: `Stopped stream ${key}` };
  }

  @Delete('stop/all')
  stopAllStreams() {
    this.rtspService.stopAllStreams();
    return { message: 'All streams stopped' };
  }
}
