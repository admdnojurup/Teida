import { Handler } from '@netlify/functions';
import { oTranslatorService } from '../../src/services/oTranslatorService';
import FormData from 'form-data';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    // Parse the multipart form data
    const formData = new FormData();
    const body = JSON.parse(event.body || '{}');

    // Add form fields
    formData.append('fromLang', body.fromLang || 'auto');
    formData.append('toLang', body.toLang || 'lt');
    formData.append('model', body.model || 'grok-3-mini');
    
    if (body.shouldTranslateImage) {
      formData.append('shouldTranslateImage', body.shouldTranslateImage);
    }
    
    if (body.preview) {
      formData.append('preview', body.preview);
    }

    // Add file
    if (body.file) {
      formData.append('file', body.file);
    }

    const result = await oTranslatorService.createTranslationNode({
      formData,
      originalFile: body.originalFile
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Translation start error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start translation',
      }),
    };
  }
}