import express from 'express';
import cors from 'cors';
import { translationRouter } from './routes/translation';

// Create Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/translation', translationRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

export const apiApp = app;