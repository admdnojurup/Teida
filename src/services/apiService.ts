// API Service - Client-side interface to the oTranslator API

// Base URL for API requests (proxied in development to avoid CORS)
const API_BASE_URL = '/api/v1';

// Types
export interface StartTranslationRequest {
  file: File;
  fromLang: string;
  toLang: string;
  model?: string;
  glossary?: string;
  shouldTranslateImage?: boolean;
  preview?: boolean;
}

export interface StartTranslationResponse {
  success: boolean;
  taskId?: string;
  message?: string;
}

export interface TranslationStatusResponse {
  status: 'Waiting' | 'Processing' | 'Completed' | 'Terminated';
  progress?: number;
  translatedFileUrl?: string;
  translatedBilingualFileUrl?: string;
  usedCredits?: number;
  tokenCount?: number;
  glossary?: string[];
  message?: string;
}

// Generate a unique request ID for logging and debugging
const generateRequestId = () => 'req-' + Math.random().toString(36).substring(2, 15);

// API Client
export const apiService = {
  /**
   * Start a new translation task
   */
  async startTranslation(
    { file, fromLang, toLang, model = 'gpt-4.1-mini', glossary, shouldTranslateImage, preview }: StartTranslationRequest
  ): Promise<StartTranslationResponse> {
    const requestId = generateRequestId();
    console.log(`[${requestId}] Starting translation request`);

    // Build multipart/form-data payload
    const formData = new FormData();
    formData.append('fromLang', fromLang);
    formData.append('toLang', toLang);
    formData.append('model', model);
    if (glossary) formData.append('glossary', glossary);
    if (shouldTranslateImage !== undefined) formData.append('shouldTranslateImage', String(shouldTranslateImage));
    if (preview !== undefined) formData.append('preview', String(preview));
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/translation/create`, {
        method: 'POST',
        headers: {
          'Authorization': process.env.OTRANSLATOR_API_KEY || '',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] Translation request failed: ${response.status} - ${errorText}`);
        return { success: false, message: `Server responded with status ${response.status}` };
      }

      const data = await response.json();
      console.log(`[${requestId}] Translation request successful:`, data);
      return { success: true, taskId: data.taskId, message: data.message };
    } catch (error) {
      console.error(`[${requestId}] API error starting translation:`, error);
      return { success: false, message: error instanceof Error ? error.message : 'Network error' };
    }
  },

  /**
   * Check translation status
   */
  async checkTranslationStatus(taskId: string): Promise<TranslationStatusResponse> {
    const requestId = generateRequestId();
    console.log(`[${requestId}] Checking translation status for task: ${taskId}`);

    try {
      const response = await fetch(`${API_BASE_URL}/translation/query`, {
        method: 'POST',
        headers: {
          'Authorization': process.env.OTRANSLATOR_API_KEY || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] Status check failed: ${response.status} - ${errorText}`);
        return { status: 'Terminated', progress: 0, message: `Server responded with status ${response.status}` };
      }

      const data = await response.json();
      console.log(`[${requestId}] Status check successful:`, data);
      return data;
    } catch (error) {
      console.error(`[${requestId}] API error checking translation status:`, error);
      return { status: 'Terminated', progress: 0, message: error instanceof Error ? error.message : 'Network error' };
    }
  },

  /**
   * Helper: Extract the download URL of the translated file
   */
  getFileDownloadUrl(statusResponse: TranslationStatusResponse): string | undefined {
    return statusResponse.translatedFileUrl;
  },
};
