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
        console.log("🚀 ~ PlayerController ~ getPlayer ~ streamUrls:", streamUrls);

        const videoPlayers = streamUrls
            .map(
                (url, index) => `
          <video id="video${index}" controls autoplay style="width: 100%;"></video>
          <p id="error${index}" style="color:red; display:none;">⚠️ Stream error. Reloading...</p>
          <script>
            function setupHLS(videoElement, errorElement, videoSrc) {
              if (Hls.isSupported()) {
                var hls = new Hls({
                  maxBufferLength: 10,
                  maxMaxBufferLength: 20,
                  startPosition: -1,
                  liveSyncDurationCount: 3,
                  enableWorker: true,
                  lowLatencyMode: true,
                });

                hls.loadSource(videoSrc);
                hls.attachMedia(videoElement);

                hls.on(Hls.Events.MEDIA_ATTACHED, function () {
                  console.log(\`✅ Streaming started for \${videoSrc}\`);
                  videoElement.muted = true;
                  videoElement.play();
                });

                hls.on(Hls.Events.ERROR, function (event, data) {
                  console.error(\`❌ HLS.js Error on \${videoSrc}:\`, data);
                  errorElement.style.display = 'block'; // Show error message
                  videoElement.style.display = 'none'; // Hide broken video
                  
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
                console.warn("❌ Browser tidak mendukung HLS:", videoSrc);
                errorElement.style.display = 'block';
                videoElement.style.display = 'none';

                // Reload iframe after delay
                setTimeout(() => {
                  window.location.reload();
                }, 5000);
              }
            }

            setupHLS(document.getElementById("video${index}"), document.getElementById("error${index}"), "${url}");
          </script>
        `
            )
            .join('<br><br>');

        const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>HLS Stream Player</title>
          <script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
        </head>
        <body> 
          ${videoPlayers}
        </body>
      </html>
    `;

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('X-Frame-Options', 'ALLOWALL'); // ✅ Allow embedding in iframe
        res.setHeader('Access-Control-Allow-Origin', '*'); // ✅ Allow CORS
        res.send(htmlContent);
    }
}
