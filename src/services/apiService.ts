interface TranslationStartParams {
  file: File;
  fromLang: string;
  toLang: string;
  model: string;
  shouldTranslateImage: string;
}

interface TranslationStatusResponse {
  status: 'completed' | 'error' | 'processing';
  message?: string;
  progress?: number;
  translatedFileUrl?: string;
  fileUrl?: string;
  translatedBilingualFileUrl?: string;
  bilingualFileUrl?: string;
  usedCredits?: number;
  tokenCount?: number;
}

interface TranslationStartResponse {
  success: boolean;
  taskId?: string;
  message?: string;
}

class ApiService {
  private readonly API_BASE_URL = '/api/translation';

  async startTranslation(params: TranslationStartParams): Promise<TranslationStartResponse> {
    try {
      const formData = new FormData();
      formData.append('file', params.file);
      formData.append('fromLang', params.fromLang);
      formData.append('toLang', params.toLang);
      formData.append('model', params.model);
      formData.append('shouldTranslateImage', params.shouldTranslateImage);

      const response = await fetch(`${this.API_BASE_URL}/start`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start translation');
      }

      const data = await response.json();
      return {
        success: true,
        taskId: data.taskId,
        message: data.message,
      };
    } catch (error) {
      console.error('Error starting translation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start translation',
      };
    }
  }

  async checkTranslationStatus(taskId: string): Promise<TranslationStatusResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/status/${taskId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check translation status');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking translation status:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to check translation status',
      };
    }
  }
}

export const apiService = new ApiService();