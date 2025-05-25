import dotenv from 'dotenv';
import FormData from 'form-data';

// Load environment variables
dotenv.config();

interface TranslationResponse {
  success: boolean;
  taskId?: string;
  message?: string;
}

interface TranslationStatusResponse {
  status: string;
  progress: number;
  translatedFileUrl?: string;
  translatedBilingualFileUrl?: string;
  usedCredits?: number;
  tokenCount?: number;
  message?: string;
}

interface TranslationOptions {
  formData: FormData;
  originalFile: {
    path: string;
    name: string;
    size: number;
  };
}

class OTranslatorService {
  private apiKey: string | undefined;
  private baseUrl: string = 'https://api.otranslator.com/v2';
  private maxRetries: number = 3;
  private retryDelay: number = 2000;

  constructor() {
    this.apiKey = process.env.OTRANSLATOR_API_KEY;
  }

  public isApiKeyConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  async createTranslationNode(options: TranslationOptions): Promise<TranslationResponse> {
    if (!this.isApiKeyConfigured()) {
      throw new Error('API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: options.formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start translation');
      }

      return {
        success: true,
        taskId: data.taskId,
        message: data.message,
      };
    } catch (error) {
      console.error('Translation creation error:', error);
      throw error;
    }
  }

  async queryTranslation(taskId: string): Promise<TranslationStatusResponse> {
    if (!this.isApiKeyConfigured()) {
      throw new Error('API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/status/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check translation status');
      }

      return {
        status: data.status,
        progress: data.progress || 0,
        translatedFileUrl: data.translatedFileUrl,
        translatedBilingualFileUrl: data.translatedBilingualFileUrl,
        usedCredits: data.usedCredits,
        tokenCount: data.tokenCount,
        message: data.message,
      };
    } catch (error) {
      console.error('Translation status check error:', error);
      throw error;
    }
  }

  async queryTranslationWithRetry(taskId: string): Promise<TranslationStatusResponse> {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.queryTranslation(taskId);
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }
    
    throw lastError;
  }
}

export const oTranslatorService = new OTranslatorService();