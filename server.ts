import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { apiApp } from './src/api/index';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Parse JSON body
app.use(express.json());

// Use the API app as middleware
app.use('/api', apiApp);

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

// For any other request, send the index.html file
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  
  // Check if API key is configured - handle safely to avoid type errors
  const apiKey = process.env.OTRANSLATOR_API_KEY;
  
  // Safely check if the API key is defined and not empty
  if (!apiKey) {
    console.warn('\x1b[33m%s\x1b[0m', 'WARNING: OTRANSLATOR_API_KEY environment variable is not set. PDF translations will not work.');
  } else {
    // Convert to string explicitly and then check if it's empty
    const apiKeyStr = String(apiKey);
    if (apiKeyStr.trim() === '') {
      console.warn('\x1b[33m%s\x1b[0m', 'WARNING: OTRANSLATOR_API_KEY environment variable is empty. PDF translations will not work.');
    } else {
      console.log('API key configured successfully.');
    }
  }
});