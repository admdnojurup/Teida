import { Handler } from '@netlify/functions';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { fileKey } = JSON.parse(event.body || '{}');

    if (!fileKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing fileKey' }),
      };
    }

    // Verify the file exists in S3
    const command = new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey,
    });

    await s3Client.send(command);

    // Generate the permanent URL
    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        fileUrl,
      }),
    };
  } catch (error) {
    console.error('Error confirming upload:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to confirm upload' }),
    };
  }
}