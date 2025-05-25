import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define environment variable interface
interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_S3_BUCKET: string;
  OTRANSLATOR_API_KEY: string;
}

// Validate and export environment variables
export const env: EnvConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  AWS_REGION: process.env.AWS_REGION || '',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || '',
  OTRANSLATOR_API_KEY: process.env.OTRANSLATOR_API_KEY || '',
};

// Validate required environment variables
const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET',
  'OTRANSLATOR_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!env[envVar as keyof EnvConfig]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}