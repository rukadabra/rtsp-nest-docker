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
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Roboto&display=swap"
      rel="stylesheet"
    />
    <title>HLS Stream Player</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
    <style>
      body {
        background-color: black;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Roboto', serif;
        font-optical-sizing: auto;
        font-weight: 400;
        font-style: normal;
        font-variation-settings: 'wdth' 100;
      }
      .video-container {
        position: relative;
        width: 99%;
        aspect-ratio: 16 / 9;
      }
      video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: none; /* Hide until stream starts */
      }
      .loading {
        opacity: 1;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #424242;
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      svg {
        width: 50%;
        height: 50%;
        display: block;
        margin: 0 auto; /* Center horizontally */
      }
      @keyframes rotate {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      .hds-flight-icon--animation-loading {
        animation: rotate 1.5s linear infinite; /* Infinite rotation */
      }
      .unsupported-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url('https://firebasestorage.googleapis.com/v0/b/squaremetre-app.appspot.com/o/file%2Fhls-not-support.png?alt=media&token=97695ad0-620c-4cdf-86d6-38a2db6b1f03');
        background-size: cover;
        background-position: center;
        display: none; /* Hidden by default, shown when HLS is unsupported */
      }
    </style>
  </head>
  <body>
    <div class="video-container">
      <video id="video" controls autoplay muted></video>
      <div class="loading" id="loading">
        <?xml version="1.0" encoding="utf-8"?>
        <!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
        <svg
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
          class="hds-flight-icon--animation-loading"
        >
          <g fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd">
            <path
              d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"
              opacity=".2"
            />
            <path
              d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z"
            />
          </g>
        </svg>
        <p style="font-size: 32px;">Loading stream...</p>
      </div>
      <div class="unsupported-image" id="unsupportedImage"></div>
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

          loadingElement.style.display = 'flex'; // Show loading initially
          document.getElementById('unsupportedImage').style.display = 'none'; // Hide unsupported image if HLS is supported

          hls.on(Hls.Events.MEDIA_ATTACHED, function () {
            console.log("✅ Streaming started for ${streamUrl}");
            videoElement.play();
            loadingElement.style.display = 'none'; // Hide loading when playing
            videoElement.style.display = 'block'; // Show video
          });

          hls.on(Hls.Events.ERROR, function (event, data) {
            console.error("❌ HLS.js Error on ${streamUrl}:", data);
            loadingElement.style.display = 'flex'; // Show loading again in case of error

            setTimeout(() => {
              console.log('♻️ Retrying stream...');
              hls.loadSource(videoSrc);
              hls.attachMedia(videoElement);
            }, 3000); // Retry after 3 seconds
          });
        } else {
          console.warn("❌ Browser not supported for HLS:", videoSrc);
          loadingElement.style.display = 'none'; // Hide loading if HLS is not supported
          document.getElementById('unsupportedImage').style.display = 'block'; // Show unsupported image
        }
      }

      // Replace with your HLS stream URL
      const streamUrl = "${streamUrl}";
      setupHLS(
        document.getElementById('video'),
        document.getElementById('loading'),
        streamUrl,
      );
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
