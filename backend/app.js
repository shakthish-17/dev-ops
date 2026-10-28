import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { validateStudent } from './services/student-service.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(currentDirectory, '../frontend');

export function createApp({ repository, databaseMode = 'unknown' }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"]
        }
      }
    })
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'UP', database: databaseMode });
  });

  app.get('/api/students', async (_request, response, next) => {
    try {
      const students = await repository.listRecent(50);
      response.status(200).json({ students });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/students', async (request, response, next) => {
    const validation = validateStudent(request.body);
    if (!validation.success) {
      return response.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Please correct the highlighted student details.',
        details: validation.errors
      });
    }

    try {
      const student = await repository.create(validation.data);
      return response.status(201).json({
        message: 'Student details saved successfully.',
        student
      });
    } catch (error) {
      if (error.code === 'DUPLICATE_STUDENT') {
        return response.status(409).json({ error: error.code, message: error.message });
      }
      return next(error);
    }
  });

  app.use(express.static(frontendDirectory, { extensions: ['html'], maxAge: '1h' }));

  app.use((error, _request, response, _next) => {
    console.error('Unhandled request error:', error);
    response.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'The request could not be completed. Please try again.'
    });
  });

  return app;
}
