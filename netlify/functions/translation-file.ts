import { Handler } from '@netlify/functions';
import { oTranslatorService } from '../../src/services/oTranslatorService';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    const taskId = event.path.split('/').pop();
    
    if (!taskId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Task ID is required' }),
      };
    }

    const result = await oTranslatorService.queryTranslation(taskId);

    if (result.status !== 'Completed' || !result.translatedFileUrl) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          message: 'Translated file not found or translation not completed',
        }),
      };
    }

    // Redirect to the file URL
    return {
      statusCode: 302,
      headers: {
        Location: result.translatedFileUrl,
      },
      body: '',
    };
  } catch (error) {
    console.error('Translation file retrieval error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get translated file',
      }),
    };
  }
}