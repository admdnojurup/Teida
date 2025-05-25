// N8n webhook service
export interface N8nWebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  timestamp?: string;
  requestId?: string;
}

interface SendFileOptions {
  file: File;
  metadata?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

// Updated webhook URL to the correct endpoint
const N8N_WEBHOOK_URL = 'https://n8n.gedarta.com/webhook/pdf-translation';

export const n8nWebhookService = {
  /**
   * Send a file to the n8n webhook
   */
  async sendFile({ file, metadata = {}, onProgress }: SendFileOptions): Promise<N8nWebhookResponse> {
    // Create form data for the webhook
    const formData = new FormData();
    
    // Add the file
    formData.append('file', file);
    
    // Add file metadata
    formData.append('filename', file.name);
    formData.append('filesize', file.size.toString());
    formData.append('filetype', file.type);
    
    // Add any additional metadata
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    try {
      // Simulate progress for better UX
      if (onProgress) {
        const progressInterval = setInterval(() => {
          onProgress(Math.min(95, Math.floor(Math.random() * 30) + 40));
        }, 500);
        
        // Cleanup function to clear interval
        const clearProgressInterval = () => clearInterval(progressInterval);
        
        // Ensure we clear the interval after 10 seconds maximum
        setTimeout(clearProgressInterval, 10000);
        
        // Start with some initial progress
        onProgress(20);
      }
      
      console.log(`Sending file "${file.name}" (${file.size} bytes) to n8n webhook...`);
      
      // Send the request with better error handling
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });
      
      // Set progress to complete
      if (onProgress) {
        onProgress(100);
      }
      
      if (!response.ok) {
        throw new Error(`Webhook responded with status: ${response.status} ${response.statusText}`);
      }
      
      // Try to parse JSON response
      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        responseData = { 
          rawResponse: text.substring(0, 100) + (text.length > 100 ? '...' : '')
        };
      }
      
      console.log('File successfully sent to n8n webhook:', responseData);
      
      return {
        success: true,
        message: 'File successfully sent to n8n webhook',
        data: responseData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error sending file to n8n webhook:', error);
      
      // Implement fallback logic for handling connection errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return {
          success: false,
          message: 'Could not connect to the n8n webhook. Please check your network connection or try again later.',
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }
};