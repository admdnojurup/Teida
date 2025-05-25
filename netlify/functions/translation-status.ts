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

    const result = await oTranslatorService.queryTranslationWithRetry(taskId);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Translation status check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to check translation status',
      }),
    };
  }
}