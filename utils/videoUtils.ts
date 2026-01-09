/**
 * Compresses a video file by downscaling resolution and reducing bitrate.
 * Optimized for Gemini API limits.
 */
export const compressVideo = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    video.onerror = () => {
      reject(new Error("Não foi possível carregar o vídeo para otimização. Codec não suportado ou arquivo corrompido."));
    };

    video.onloadedmetadata = () => {
      // Improved resolution for better AI detection (Max height 720p)
      const MAX_HEIGHT = 720;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (height > MAX_HEIGHT) {
        const scale = MAX_HEIGHT / height;
        height = MAX_HEIGHT;
        width = Math.round(width * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error("Erro interno: Contexto gráfico (Canvas) indisponível."));
        return;
      }

      // Detect supported mime types for browser
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      }

      const stream = canvas.captureStream(24); // 24fps as requested for better motion tracking

      // --- ADAPTIVE BITRATE LOGIC ---
      // 1. Define safe ceiling (15MB in Bytes)
      const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

      // 2. Get duration (with safety fallback)
      const duration = video.duration || 60;

      // 3. Calculate mathematical max bitrate to fit usage
      // Formula: (Size * 8 bits) / Duration
      const maxAllowedBitrate = Math.floor((MAX_FILE_SIZE_BYTES * 8) / duration);

      // 4. Apply quality limits (Ceiling: 1.5Mbps, Floor: 250kbps)
      const targetBitrate = Math.min(1500000, maxAllowedBitrate);
      const finalBitrate = Math.max(250000, targetBitrate);

      console.log(`[VideoUtils] Optimization: Duration=${duration}s, Calculated Bitrate=${finalBitrate / 1000}kbps`);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: finalBitrate
      });

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const compressedFile = new File([blob], "optimized_exercise.mp4", { type: mimeType });

        URL.revokeObjectURL(video.src);
        video.remove();
        canvas.remove();

        resolve(compressedFile);
      };

      mediaRecorder.start();
      video.playbackRate = 1.0;

      video.play().then(() => {
        const draw = () => {
          if (video.paused || video.ended) return;
          ctx.drawImage(video, 0, 0, width, height);
          requestAnimationFrame(draw);
        };
        draw();
      }).catch(e => {
        reject(new Error("Falha ao processar frames do vídeo. Tente um arquivo diferente."));
      });

      video.onended = () => {
        mediaRecorder.stop();
      };
    };
  });
};