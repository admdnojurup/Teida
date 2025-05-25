import { delay } from '../utils/delay';

// Webhook URLs configuration
const WEBHOOKS = {
  START_TRANSLATION: 'https://hook.eu2.make.com/mwn42vvuppgbja4cus51cx9j97uwbe2j',
  CHECK_STATUS: 'https://hook.eu2.make.com/4qdwegbp7qn5ycc70bvjko7gyqgyu8lt',
  GET_TRANSLATED_FILE: 'https://your-make-com-webhook-url/get-translated-file'
};

// Types for API responses
interface StartTranslationResponse {
  success: boolean;
  translationId?: string;
  taskId?: string;
  message?: string;
}

interface MakeWebhookResponse {
  taskId?: string;
  status?: string;
  progress?: number;
  translatedFileUrl?: string;
  translatedBilingualFileUrl?: string;
  message?: string;
}

interface CheckStatusResponse {
  status: 'pending' | 'translating' | 'completed' | 'error';
  progress?: number;
  message?: string;
  fileUrl?: string;
}

interface GetTranslatedFileResponse {
  success: boolean;
  fileUrl?: string;
  message?: string;
}

// Store active translations
const activeTranslations = new Map<string, {
  taskId: string;
  fileName: string;
  timestamp: number;
  sourceLanguage: string;
  targetLanguage: string;
}>();

// Helper function to ensure taskId is properly extracted from the response
const extractTaskId = (response: unknown): string => {
  console.log('Extracting taskId from response:', response);
  
  // If it's null or undefined, return empty string
  if (response === null || response === undefined) {
    console.warn('taskId is null or undefined');
    return '';
  }
  
  // Handle string response
  if (typeof response === 'string') {
    try {
      // Check if it's a JSON string
      if (response.trim().startsWith('{') && response.includes('taskId')) {
        const parsedResponse = JSON.parse(response);
        if (typeof parsedResponse.taskId === 'string') {
          console.log('Extracted taskId from JSON string:', parsedResponse.taskId);
          return parsedResponse.taskId;
        }
      }
      
      // Check if it's a taskId with curly braces format
      const taskIdMatch = response.match(/\"taskId\":\"([^\"]+)\"/);
      if (taskIdMatch && taskIdMatch[1]) {
        console.log('Extracted taskId from string with regex:', taskIdMatch[1]);
        return taskIdMatch[1];
      }
      
      // If it's a simple string and looks like a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(response)) {
        console.log('Using taskId string directly (valid UUID format):', response);
        return response;
      }
      
      // Just return the string as is
      console.log('Using taskId string as-is:', response);
      return response;
    } catch (error) {
      console.error('Error parsing taskId string:', error);
      return response;
    }
  }
  
  // Handle object response
  if (typeof response === 'object' && response !== null) {
    // If it has a taskId property
    if ('taskId' in response) {
      const taskId = (response as { taskId: unknown }).taskId;
      if (typeof taskId === 'string') {
        // Recursively process the taskId property to handle nested JSON
        return extractTaskId(taskId);
      } else if (taskId !== null && taskId !== undefined) {
        // Safely convert non-string taskId to string
        try {
          return String(taskId);
        } catch (e) {
          console.error('Failed to convert taskId to string:', e);
          return '';
        }
      }
    }
    
    // If the object has a custom toString method (not the default one)
    if (
      typeof (response as any).toString === 'function' && 
      (response as any).toString !== Object.prototype.toString
    ) {
      try {
        const stringValue = (response as any).toString();
        if (typeof stringValue === 'string') {
          return stringValue;
        }
      } catch (e) {
        console.error('Failed to call toString() on object:', e);
      }
    }
    
    // For safety, return empty string instead of trying to convert complex object
    console.warn('Cannot safely convert complex object to string, returning empty string');
    return '';
  }
  
  // Fallback: safely return string representation
  try {
    return String(response);
  } catch (e) {
    console.error('Failed to convert response to string:', e);
    return '';
  }
};

// The service for interacting with the webhooks
export const webhookService = {
  // Start the translation process
  async startTranslation(
    file: File, 
    sourceLanguage: string = 'auto', 
    targetLanguage: string = 'lt'
  ): Promise<StartTranslationResponse> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('sourceLanguage', sourceLanguage);
      formData.append('targetLanguage', targetLanguage);
      
      console.log(`Starting translation from ${sourceLanguage} to ${targetLanguage}`);
      
      const response = await fetch(WEBHOOKS.START_TRANSLATION, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let responseData: MakeWebhookResponse = {};
      let responseText = '';
      
      try {
        // Try to parse as JSON first
        responseText = await response.text();
        try {
          responseData = JSON.parse(responseText);
          console.log('Parsed JSON response:', responseData);
        } catch (e) {
          console.log('Response is not valid JSON, using as text:', responseText);
          // Try to extract taskId from text if possible
          const taskIdMatch = responseText.match(/taskId[:\s]+"([^"]+)"/i);
          if (taskIdMatch && taskIdMatch[1]) {
            responseData.taskId = taskIdMatch[1];
          } else {
            responseData.message = responseText;
          }
        }
      } catch (error) {
        console.error('Error parsing response:', error);
        throw new Error('Failed to parse response from translation service');
      }
      
      // Extract taskId if available
      let rawTaskId = responseData.taskId || '';
      console.log('Raw taskId from response:', rawTaskId);
      
      const extractedTaskId = extractTaskId(rawTaskId);
      console.log('Extracted taskId:', extractedTaskId);
      
      // Generate a temporary taskId if none was provided
      // This is needed to track the translation until the real taskId is received
      const effectiveTaskId = extractedTaskId || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Store translation information with the effective taskId
      const translationInfo = {
        taskId: effectiveTaskId,
        fileName: file.name,
        timestamp: Date.now(),
        sourceLanguage,
        targetLanguage
      };
      
      console.log('Storing translation info with taskId:', effectiveTaskId);
      activeTranslations.set(effectiveTaskId, translationInfo);
      
      return {
        success: true,
        translationId: effectiveTaskId,
        taskId: effectiveTaskId,
        message: responseData.message || 'Translation started'
      };
    } catch (error) {
      console.error('Error starting translation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start translation'
      };
    }
  },
  
  // Check the status of a translation
  async checkTranslationStatus(translationId: string): Promise<CheckStatusResponse> {
    try {
      console.log(`Checking status for taskId: ${translationId}`);
      
      const translationInfo = activeTranslations.get(translationId);
      if (!translationInfo) {
        console.warn(`Translation info not found for taskId: ${translationId}`);
      }
      
      // Only make the API call if we have a valid task ID (not a temporary one)
      const isTemporaryId = translationId.startsWith('temp_');
      
      let data: MakeWebhookResponse = {};
      let responseText = '';
      
      if (!isTemporaryId) {
        // Use the exact same taskId that was returned from the initial request
        const response = await fetch(`${WEBHOOKS.CHECK_STATUS}?taskId=${translationId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Process response
        try {
          responseText = await response.text();
          console.log('Raw status response:', responseText);
          
          try {
            data = JSON.parse(responseText);
            console.log('Parsed JSON status response:', data);
          } catch (e) {
            console.log('Response is not valid JSON, using as text');
            
            // Try to extract progress from text
            const progressMatch = responseText.match(/progress[:\s]+(\d+)/i);
            if (progressMatch && progressMatch[1]) {
              data.progress = parseInt(progressMatch[1], 10);
            }
            
            // Try to extract URL from text
            const urlMatch = responseText.match(/(https?:\/\/[^\s]+\.pdf)/i);
            if (urlMatch && urlMatch[1]) {
              data.translatedFileUrl = urlMatch[1];
            }
            
            // Try to extract status from text
            if (responseText.toLowerCase().includes('completed')) {
              data.status = 'completed';
            } else if (responseText.toLowerCase().includes('error')) {
              data.status = 'error';
            } else {
              data.status = 'translating';
            }
            
            data.message = responseText;
          }
        } catch (error) {
          console.error('Error parsing status response:', error);
          throw new Error('Failed to parse response from translation service');
        }
      } else {
        // For temporary IDs, just return a standard "translating" status
        console.log('Using temporary taskId, returning default translating status');
        data = {
          status: 'translating',
          progress: 0,
          message: 'Translation in progress...'
        };
      }
      
      // Determine status
      if (data.translatedFileUrl) {
        console.log('Translation completed with URL:', data.translatedFileUrl);
        return {
          status: 'completed',
          progress: 100,
          fileUrl: data.translatedFileUrl
        };
      }
      
      if (data.status?.toLowerCase() === 'completed' && data.translatedFileUrl) {
        return {
          status: 'completed',
          progress: 100,
          fileUrl: data.translatedFileUrl
        };
      }
      
      if (data.status?.toLowerCase() === 'error') {
        return {
          status: 'error',
          message: data.message || 'An error occurred during translation'
        };
      }
      
      return {
        status: 'translating',
        progress: data.progress || 0,
        message: data.message || data.status
      };
    } catch (error) {
      console.error('Error checking translation status:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to check translation status'
      };
    }
  },
  
  // Get the translated file
  async getTranslatedFile(translationId: string): Promise<GetTranslatedFileResponse> {
    try {
      console.log(`Getting translated file for taskId: ${translationId}`);
      
      const translationInfo = activeTranslations.get(translationId);
      if (!translationInfo) {
        throw new Error('Translation not found');
      }
      
      const statusResponse = await this.checkTranslationStatus(translationId);
      
      if (statusResponse.status !== 'completed' || !statusResponse.fileUrl) {
        throw new Error('Translation not completed or file URL not available');
      }
      
      // After successful retrieval, clean up the stored translation
      activeTranslations.delete(translationId);
      
      return {
        success: true,
        fileUrl: statusResponse.fileUrl
      };
    } catch (error) {
      console.error('Error getting translated file:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get translated file'
      };
    }
  }
};