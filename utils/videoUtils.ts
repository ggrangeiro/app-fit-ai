/**
 * Compresses a video file by downscaling resolution and reducing bitrate.
 * Optimized for Gemini API limits.
 */
export const compressVideo = async (file: File): Promise<File> => {
  console.log(`[VideoUtils] Starting optimization for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    video.onerror = () => {
      console.error("[VideoUtils] Error loading video source");
      reject(new Error("Não foi possível carregar o vídeo para otimização. Codec não suportado ou arquivo corrompido."));
    };

    video.onloadedmetadata = () => {
      console.log(`[VideoUtils] Metadata loaded: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`);

      // Improved resolution for better AI detection (Max height 720p)
      const MAX_HEIGHT = 720;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (height > MAX_HEIGHT) {
        const scale = MAX_HEIGHT / height;
        height = MAX_HEIGHT;
        width = Math.round(width * scale);
      }

      // --- HARDWARE CODEC COMPATIBILITY FIX ---
      // Many mobile encoders FAIL if dimensions are not even (Multiples of 2 or 16)
      // We force even numbers for width and height.
      if (width % 2 !== 0) width -= 1;
      if (height % 2 !== 0) height -= 1;

      console.log(`[VideoUtils] Final Target resolution (even): ${width}x${height}`);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error("[VideoUtils] Canvas context not available");
        reject(new Error("Erro interno: Contexto gráfico (Canvas) indisponível."));
        return;
      }

      // Detect supported mime types
      // For Android/Chrome, webm/vp8 or vp9 is standard. 
      // Avoid 'video/mp4' for recording if not explicitly stable.
      let mimeType = 'video/webm;codecs=vp8';
      const types = [
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4' // Fallback
      ];

      for (const t of types) {
        if (MediaRecorder.isTypeSupported(t)) {
          mimeType = t;
          break;
        }
      }

      console.log(`[VideoUtils] Selected MimeType: ${mimeType}`);

      // Some browsers (especially mobile) prefer 30fps or no frame rate specified in captureStream
      const stream = canvas.captureStream(24);
      console.log("[VideoUtils] Stream captured");

      // --- ADAPTIVE BITRATE LOGIC ---
      const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
      const duration = video.duration || 60;
      const maxAllowedBitrate = Math.floor((MAX_FILE_SIZE_BYTES * 8) / duration);
      const targetBitrate = Math.min(1500000, maxAllowedBitrate);
      const finalBitrate = Math.max(250000, targetBitrate);

      console.log(`[VideoUtils] Target Bitrate: ${finalBitrate / 1000}kbps`);

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: finalBitrate
        });
      } catch (e: any) {
        console.error(`[VideoUtils] MediaRecorder creation FAILED: ${e.message}`);
        reject(new Error("Erro ao iniciar gravador de vídeo (Codec incompatível)."));
        return;
      }

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        console.log(`[VideoUtils] Recording stopped. Chunks: ${chunks.length}`);
        const blob = new Blob(chunks, { type: mimeType });
        console.log(`[VideoUtils] Final size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

        // Use consistent naming, but keep original if needed.
        const compressedFile = new File([blob], "optimized_exercise.webm", { type: mimeType });

        URL.revokeObjectURL(video.src);
        video.remove();
        canvas.remove();

        resolve(compressedFile);
      };

      mediaRecorder.start();
      console.log("[VideoUtils] MediaRecorder started");
      video.playbackRate = 1.0;

      video.play().then(() => {
        console.log("[VideoUtils] Playback started for encoding");
        const draw = () => {
          if (video.paused || video.ended) {
            console.log(`[VideoUtils] Encoding draw loop finished. Paused: ${video.paused}, Ended: ${video.ended}`);
            return;
          }
          ctx.drawImage(video, 0, 0, width, height);
          requestAnimationFrame(draw);
        };
        draw();
      }).catch(e => {
        console.error(`[VideoUtils] Playback failed: ${e.message}`);
        reject(new Error("Falha ao processar frames do vídeo para otimização."));
      });

      video.onended = () => {
        console.log("[VideoUtils] Video end reached");
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      };
    };
  });
};