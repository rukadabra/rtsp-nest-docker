export const runInIframe = (config: {
    autoplay: boolean;
    muted: boolean;
    streamUrl: string[];
    position?: 'auto' | 'grid' | 'row' | 'column';
}) => {
    const Hls = (window as any).Hls;
    if (!Hls) return console.error("Hls.js not loaded");

    const layoutType = config.position || 'auto';
    const streamCount = config.streamUrl.length;

    const container = document.getElementById('rtsp-root-iframe');
    container.innerHTML = ''; // Clear
    container.className = 'video-grid-layout';

    if (layoutType === 'auto') {
        const columns = Math.ceil(Math.sqrt(streamCount));
        container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    } else {
        container.className = `video-layout layout-${layoutType}`;
        container.style.gridTemplateColumns = ''; // Reset
    }

    config.streamUrl.forEach((streamId) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-wrapper';

        const video = document.createElement('video');
        video.setAttribute('autoplay', config.autoplay ? 'true' : '');
        video.setAttribute('muted', config.muted ? 'true' : '');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('preload', 'auto');
        video.setAttribute('disablePictureInPicture', '');
        video.setAttribute('controlsList', 'nodownload noremoteplayback');

        video.controls = false;
        video.autoplay = config.autoplay;
        video.muted = config.muted;

        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.innerHTML = `
      <div style="text-align:center;">
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" class="hds-flight-icon--animation-loading" width="48" height="48">
          <g fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd">
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" opacity=".2" />
            <path d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z" />
          </g>
        </svg>
        <p>Loading Video...</p>
      </div>
    `;
        wrapper.appendChild(video);
        wrapper.appendChild(loading);
        container.appendChild(wrapper);

        if (Hls.isSupported()) {
            const hls = new Hls({
                maxBufferLength: 5,
                maxMaxBufferLength: 10,
                liveSyncDurationCount: 2,
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 5,
            });

            const videoSrc = `https://stream.gproject.tech/hls/${streamId}.m3u8`;
            hls.loadSource(videoSrc);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                loading.classList.add('hidden');
                video.controls = true;
                video.style.opacity = '1'; // Restore after loading
                video.play();
            });


            // hls.on(Hls.Events.ERROR, () => {
            //     loading.classList.remove('hidden');
            //     video.controls = false;
            //     video.style.opacity = '0.3'; // Dim the video when reloading
            //     setTimeout(() => {
            //         hls.loadSource(videoSrc);
            //         hls.attachMedia(video);
            //     }, 3000);
            // });
        } else {
            loading.innerHTML = `<p>HLS not supported in this browser for ${streamId}</p>`;
        }
    });
};
