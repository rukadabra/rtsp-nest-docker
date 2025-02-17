import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('player')
export class PlayerController {
  @Get()
  async getPlayer(@Query('streams') streams: string, @Res() res: Response) {
    if (!streams) {
      return res.status(400).send('No streams provided');
    }

    const streamUrls = streams.split(','); // Expecting comma-separated stream URLs
    const streamUrl = streamUrls?.[0];

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HLS Stream Player</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
    <style>
      body {
        background-color: black;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      .video-container {
        position: relative;
        width: 99%;
        aspect-ratio: 16 / 9;
        background: url("https://firebasestorage.googleapis.com/v0/b/squaremetre-app.appspot.com/o/file%2Fhls-not-support.png?alt=media&token=97695ad0-620c-4cdf-86d6-38a2db6b1f03")
          center/cover no-repeat;
      }
      video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    </style>
  </head>
  <body>
    <div class="video-container">
      <video id="video" autoplay muted></video>
    </div>

    <script>
      function setupHLS(videoElement, videoSrc) {
        if (Hls.isSupported()) {
          var hls = new Hls({
            maxBufferLength: 5,
            maxMaxBufferLength: 10,
            liveSyncDurationCount: 2,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 5,
          });

          hls.loadSource(videoSrc);
          hls.attachMedia(videoElement);

          hls.on(Hls.Events.MEDIA_ATTACHED, function () {
            console.log("✅ Streaming started for ${streamUrl}");
            videoElement.play();
          });

          hls.on(Hls.Events.ERROR, function (event, data) {
            console.error("❌ HLS.js Error on ${streamUrl}:", data);
            videoElement.pause(); // Pause on last frame
            // Reload iframe after delay
            setTimeout(() => {
              window.location.reload();
            }, 5000); // Reload after 5 seconds
          });
        } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
          videoElement.src = videoSrc;
          videoElement.addEventListener("loadedmetadata", function () {
            videoElement.play();
          });
        } else {
          console.warn("❌ Browser not supported for HLS:", videoSrc);
        }
      }

      // Replace with your HLS stream URL
      const streamUrl = "${streamUrl}";
      setupHLS(document.getElementById("video"), streamUrl);
    </script>
  </body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // ✅ Allow embedding in iframe
    res.setHeader('Access-Control-Allow-Origin', '*'); // ✅ Allow CORS
    res.send(htmlContent);
  }
}
