/**
 * Compresses a video file by downscaling resolution and reducing bitrate.
 * This runs entirely in the browser using HTML5 Canvas and MediaRecorder.
 */
export const compressVideo = async (file: File): Promise<File> => {
  // If file is already small enough, return it as is.
  if (file.size <= 19 * 1024 * 1024) return file;
  
  // Hard limit for browser performance (prevent crashes on mobile)
  if (file.size > 200 * 1024 * 1024) {
    throw new Error("O vídeo é muito grande (>200MB) para processamento no navegador. Por favor, grave um vídeo mais curto.");
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);
    
    video.onerror = () => {
      reject(new Error("Não foi possível carregar o vídeo para otimização."));
    };

    video.onloadedmetadata = () => {
      // Calculate new dimensions (Max height 720p to save size)
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
        reject(new Error("Contexto gráfico não disponível."));
        return;
      }

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('video/mp4') 
        ? 'video/mp4' 
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm');

      // Create stream (30fps is enough for exercise analysis)
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 1500000 // 1.5 Mbps bitrate target (very lightweight)
      });

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const compressedFile = new File([blob], "optimized_exercise.mp4", { type: mimeType });
        
        // Clean up
        URL.revokeObjectURL(video.src);
        video.remove();
        canvas.remove();
        
        console.log(`Compression complete: ${Math.round(file.size/1024/1024)}MB -> ${Math.round(compressedFile.size/1024/1024)}MB`);
        resolve(compressedFile);
      };

      mediaRecorder.start();

      // Play video at 2x speed to compress faster (Gemini doesn't care about playback speed for static pose analysis, 
      // but to be safe we'll stick to 1.5x or 1x if audio/timing was critical. 
      // For pure visual form analysis, slightly faster playback is usually fine, but let's keep 1x to ensure rep counting is accurate).
      video.playbackRate = 1.0; 
      
      video.play().then(() => {
        const draw = () => {
          if (video.paused || video.ended) return;
          ctx.drawImage(video, 0, 0, width, height);
          requestAnimationFrame(draw);
        };
        draw();
      }).catch(e => {
        reject(new Error("Erro ao reproduzir vídeo para compressão: " + e.message));
      });

      video.onended = () => {
        mediaRecorder.stop();
      };
    };
  });
};