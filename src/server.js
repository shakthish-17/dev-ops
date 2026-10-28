import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { MemoryStudentRepository } from './repositories/memory-student-repository.js';
import { MongoStudentRepository } from './repositories/mongo-student-repository.js';

const config = loadConfig();

async function start() {
  let repository;
  let databaseMode;

  if (config.useMemory) {
    repository = new MemoryStudentRepository();
    databaseMode = 'memory';
    console.warn('MONGODB_URI is not set; using the development-only in-memory repository.');
  } else {
    if (!config.mongoUri) {
      throw new Error('MONGODB_URI is required when NODE_ENV=production.');
    }
    await mongoose.connect(config.mongoUri, {
      dbName: config.mongoDatabase,
      serverSelectionTimeoutMS: 10_000
    });
    repository = new MongoStudentRepository();
    databaseMode = 'mongodb';
    console.log('Connected to MongoDB.');
  }

  const app = createApp({ repository, databaseMode });
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`Student Registry listening on port ${config.port}.`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received; shutting down.`);
    server.close(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('Application startup failed:', error.message);
  process.exit(1);
});
