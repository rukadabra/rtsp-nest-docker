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
    const streamUrl = `https://stream.gproject.tech/hls/${streamUrls?.[0]}.m3u8`;

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
        display: none; /* Hide until stream starts */
      }
      .loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 18px;
        font-family: Arial, sans-serif;
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="video-container">
      <video id="video" autoplay muted></video>
      <div id="loading" class="loading">Loading stream...</div>
    </div>

    <script>
      function setupHLS(videoElement, loadingElement, videoSrc) {
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
          
          loadingElement.style.display = "block"; // Show loading at start

          hls.on(Hls.Events.MEDIA_ATTACHED, function () {
            console.log("✅ Streaming started for ${streamUrl}");
            videoElement.play();
            loadingElement.style.display = "none"; // Hide loading when playing
            videoElement.style.display = "block"; // Show video
          });

          hls.on(Hls.Events.ERROR, function (event, data) {
            console.error("❌ HLS.js Error on ${streamUrl}:", data);
            loadingElement.style.display = "block"; // Show loading again
            
            setTimeout(() => {
              console.log("♻️ Retrying stream...");
              hls.loadSource(videoSrc);
              hls.attachMedia(videoElement);
            }, 3000); // Retry after 3 seconds
          });
        } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
          videoElement.src = videoSrc;
          videoElement.addEventListener("loadedmetadata", function () {
            videoElement.play();
          });
        } else {
          console.warn("❌ Browser not supported for HLS:", videoSrc);
          loadingElement.style.display = "none"; // Hide loading on unsupported
        }
      }

      // Replace with your HLS stream URL
      const streamUrl = "${streamUrl}";
      setupHLS(document.getElementById("video"), document.getElementById("loading"), streamUrl);
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
