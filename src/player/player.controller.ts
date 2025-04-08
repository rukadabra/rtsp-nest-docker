import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import fullIframe from './iframe/iframe_output';

@Controller('player')
export class PlayerController {
  @Get()
  async getPlayer(@Query('streams') streams: string, @Query('position') position: string, @Res() res: Response) {
    if (!streams) {
      return res.status(400).send('No streams provided');
    }

    const streamUrls = streams.split(','); // Expecting comma-separated stream URLs
    // const streamUrl = `https://stream.gproject.tech/hls/${streamUrls?.[0]}.m3u8`;

    const htmlContent = fullIframe(streamUrls, position)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // ✅ Allow embedding in iframe
    res.setHeader('Access-Control-Allow-Origin', '*'); // ✅ Allow CORS
    res.send(htmlContent);
  }
}
