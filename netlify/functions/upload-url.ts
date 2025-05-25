import { Handler } from '@netlify/functions';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../src/config/env';

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { fileName, fileType, fileSize } = JSON.parse(event.body || '{}');

    if (!fileName || !fileType || !fileSize) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    if (!ALLOWED_TYPES.includes(fileType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'File type not allowed' }),
      };
    }

    if (fileSize > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'File size exceeds limit' }),
      };
    }

    const fileKey = `uploads/${uuidv4()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: fileKey,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      body: JSON.stringify({
        uploadUrl: signedUrl,
        fileKey,
        expiresIn: 300,
      }),
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate upload URL' }),
    };
  }
}