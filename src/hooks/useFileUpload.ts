import { useState } from 'react';

interface UploadOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (url: string) => void;
  onError?: (error: Error) => void;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const upload = async (file: File, options?: UploadOptions) => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Get presigned URL
      const presignedUrlResponse = await fetch('/.netlify/functions/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!presignedUrlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileKey } = await presignedUrlResponse.json();

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Confirm upload
      const confirmResponse = await fetch('/.netlify/functions/confirm-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileKey }),
      });

      if (!confirmResponse.ok) {
        throw new Error('Failed to confirm upload');
      }

      const { fileUrl } = await confirmResponse.json();

      setProgress(100);
      options?.onComplete?.(fileUrl);

      return fileUrl;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return {
    upload,
    uploading,
    progress,
    error,
  };
};