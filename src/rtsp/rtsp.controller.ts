import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { RtspService } from './rtsp.service';

@Controller('rtsp')
export class RtspController {
  constructor(private readonly rtspService: RtspService) { }

  @Post('stop')
  async stopStream(@Body() body: { url: string }) {
    if (!body.url) {
      throw new BadRequestException('URL is required to stop the stream.');
    }

    this.rtspService.stopHlsStream(body.url);

    return { message: 'Stream stop request sent', url: body.url };
  }

  @Post('stop-all')
  async stopAllStreams() {
    this.rtspService.stopAllStreams();
    return { message: 'All streams stopped successfully.' };
  }

  @Post('start')
  async startBatchStream(
    @Body() body: { urls: { url: string; id: string; project: string }[] },
  ) {
    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      throw new BadRequestException('No URLs provided for streaming');
    }

    const results = await Promise.all(
      body.urls.map(async (urlObj) => {
        try {
          const fileName = await this.rtspService.startHlsStream(urlObj);
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
}
