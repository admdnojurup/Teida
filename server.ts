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

// Enable CORS for all routes with specific configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Parse JSON body - this is critical for handling JSON requests
app.use(express.json());

// Handle file uploads
app.use(express.raw({ type: 'application/pdf', limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory for models-info.json
app.use(express.static(join(__dirname, 'public')));

// Use the API routes
app.use('/api', apiApp);

// This catch-all route should come AFTER all API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});