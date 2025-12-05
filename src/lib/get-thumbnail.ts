export const extractThumbnail = (file: File, second = 1): Promise<string> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');

    video.src = url;
    video.currentTime = second;

    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg');

      URL.revokeObjectURL(url);
      resolve(thumbnail);
    };

    video.onerror = reject;
  });
}
