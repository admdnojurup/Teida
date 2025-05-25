import express from 'express';
import { oTranslatorService } from '../../services/oTranslatorService';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import FormData from 'form-data';

const router = express.Router();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for file uploads with disk storage for better reliability
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, tempDir);
  },
  filename: function(req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

/**
 * @route POST /api/translation/start
 * @desc Start a new translation
 */
router.post('/start', (req, res, next) => {
  // Generate request ID for tracing
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.headers['x-request-id'] = requestId;
  console.log(`[${requestId}] Starting new translation request`);
  
  // Process file upload with error handling
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error(`[${requestId}] File upload error:`, err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          requestId,
          message: 'File size exceeds the 100MB limit',
        });
      }
      
      if (err.message === 'Only PDF files are allowed') {
        return res.status(415).json({
          success: false,
          requestId,
          message: 'Only PDF files are allowed',
        });
      }
      
      return res.status(400).json({
        success: false,
        requestId,
        message: 'File upload error: ' + (err.message || 'Unknown error'),
      });
    }
    
    // Continue with request processing
    handleTranslationStart(req, res, requestId).catch(next);
  });
});

async function handleTranslationStart(req, res, requestId) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        requestId,
        message: 'No PDF file provided',
      });
    }

    // Check if oTranslator API key is configured
    if (!oTranslatorService.isApiKeyConfigured()) {
      return res.status(503).json({
        success: false,
        requestId,
        message: 'API key not configured. Please set the OTRANSLATOR_API_KEY environment variable.',
      });
    }

    // Get parameters from request body - support both naming conventions
    const fromLang = req.body.fromLang || req.body.sourceLanguage || 'auto';
    const toLang = req.body.toLang || req.body.targetLanguage || 'lt';
    const model = req.body.model || 'grok-3-mini';
    const shouldTranslateImage = req.body.shouldTranslateImage;
    const preview = req.body.preview;

    console.log(`[${requestId}] Processing translation request:`, {
      fromLang,
      toLang,
      model,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });

    // Use file path and create a read stream instead of browser File API
    const filePath = req.file.path;
    const fileStream = fs.createReadStream(filePath);
    const fileName = req.file.originalname;
    
    // Create form data for Node environment
    const formData = new FormData();
    formData.append('fromLang', fromLang);
    formData.append('toLang', toLang);
    formData.append('model', model);
    
    if (shouldTranslateImage) {
      formData.append('shouldTranslateImage', shouldTranslateImage);
    }
    
    if (preview) {
      formData.append('preview', preview);
    }
    
    // Add file to form data with proper filename
    formData.append('file', fileStream, fileName);

    // Start translation using oTranslator service
    const result = await oTranslatorService.createTranslationNode({
      formData,
      originalFile: {
        path: filePath,
        name: fileName,
        size: req.file.size
      }
    });

    // Clean up the temporary file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.error(`[${requestId}] Error cleaning up temporary file:`, cleanupError);
      // Non-critical error, continue with the response
    }

    // Add request ID to response for client-side correlation
    return res.json({
      success: result.success,
      taskId: result.taskId,
      requestId,
      message: result.message,
    });
  } catch (error) {
    console.error(`[${requestId}] Error starting translation:`, error);
    return res.status(500).json({
      success: false,
      requestId,
      message: error instanceof Error ? error.message : 'Failed to start translation',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * @route GET /api/translation/status/:taskId
 * @desc Check the status of a translation
 */
router.get('/status/:taskId', async (req, res) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        requestId,
        message: 'Task ID is required',
      });
    }
    
    console.log(`[${requestId}] Checking translation status for task: ${taskId}`);
    
    // Check if oTranslator API key is configured
    if (!oTranslatorService.isApiKeyConfigured()) {
      return res.status(503).json({
        success: false,
        requestId,
        message: 'API key not configured. Please set the OTRANSLATOR_API_KEY environment variable.',
      });
    }
    
    // Use the retry mechanism for better reliability
    const result = await oTranslatorService.queryTranslationWithRetry(taskId);
    
    // Map oTranslator status to our application status
    let status;
    switch (result.status) {
      case 'Waiting':
      case 'Processing':
        status = 'translating';
        break;
      case 'Completed':
        status = 'completed';
        break;
      case 'Terminated':
        status = 'error';
        break;
      default:
        status = 'translating';
    }
    
    return res.json({
      status: status,
      requestId,
      progress: result.progress,
      fileUrl: result.translatedFileUrl,
      translatedFileUrl: result.translatedFileUrl,
      bilingualFileUrl: result.translatedBilingualFileUrl,
      translatedBilingualFileUrl: result.translatedBilingualFileUrl,
      usedCredits: result.usedCredits,
      tokenCount: result.tokenCount,
      message: result.message,
    });
  } catch (error) {
    console.error(`[${requestId}] Error checking translation status:`, error);
    return res.status(500).json({
      success: false,
      requestId,
      message: error instanceof Error ? error.message : 'Failed to check translation status',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * @route GET /api/translation/file/:taskId
 * @desc Get the translated file
 */
router.get('/file/:taskId', async (req, res) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        requestId,
        message: 'Task ID is required',
      });
    }
    
    console.log(`[${requestId}] Getting translated file for task: ${taskId}`);
    
    // Check if oTranslator API key is configured
    if (!oTranslatorService.isApiKeyConfigured()) {
      return res.status(503).json({
        success: false,
        requestId,
        message: 'API key not configured. Please set the OTRANSLATOR_API_KEY environment variable.',
      });
    }
    
    const result = await oTranslatorService.queryTranslation(taskId);
    
    if (result.status !== 'Completed' || !result.translatedFileUrl) {
      return res.status(404).json({
        success: false,
        requestId,
        message: 'Translated file not found or translation not completed',
      });
    }
    
    // Redirect to the file URL
    return res.redirect(result.translatedFileUrl);
  } catch (error) {
    console.error(`[${requestId}] Error getting translated file:`, error);
    return res.status(500).json({
      success: false,
      requestId,
      message: error instanceof Error ? error.message : 'Failed to get translated file',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

export const translationRouter = router;