import { BadRequestException, Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { RtspService } from './rtsp.service';

@Controller('rtsp')
export class RtspController {
  constructor(private readonly rtspService: RtspService) { }

  @Post('stop')
  async stopStream(@Body() body: { url: string }, @Res() res: Response) {
    if (!body.url) {
      throw new BadRequestException('URL is required to stop the stream.');
    }

    this.rtspService.stopHlsStream(body.url);

    return { message: 'Stream stop request sent', url: body.url };
  }

  @Post('stop-all')
  async stopAllStreams(@Res() res: Response) {
    this.rtspService.stopAllStreams();
    return { message: 'All streams stopped successfully.' };
  }



  @Post('start')
  async startBatchStream(@Body() body: { urls: string[] }, @Res() res: Response) {
    if (!body.urls || !Array.isArray(body.urls)) {
      throw new BadRequestException('Something bad happened', {
        cause: new Error(),
        description: 'no url found',
      });
    }

    const results = body.urls.map((url) => {
      const fileName = this.rtspService.startHlsStream(url);
      return { url, fileName: fileName.fileName, streamUrl: `/hls/${fileName.fileName}` };
    });

    return { message: 'Batch processing completed', results };
  }
}
