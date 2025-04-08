import * as fs from 'fs';
import * as path from 'path';
import { runInIframe } from './iframe';

const html = fs.readFileSync(
    path.join(process.cwd(), 'public/iframe/iframe.html'),
    'utf-8',
);
const css = fs.readFileSync(
    path.join(process.cwd(), 'public/iframe/iframe.css'),
    'utf-8',
);

// Inline the script function as a string
const js = runInIframe.toString();


export function generateIframeHTML(streamUrl: string[], position: string = 'auto'): string {
    const config = {
        streamUrl,
        autoplay: true,
        muted: true,
        position
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet" />
    <title>HLS Stream Player</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
    <style>${css}</style>
</head>
<body>
  ${html}
  <script>(${js})(${JSON.stringify(config)});</script>
</body>
</html>
`;

}

export default generateIframeHTML;
