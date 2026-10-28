function parsePort(value) {
  const parsed = Number(value ?? 3000);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 3000;
}

export function loadConfig(environment = process.env) {
  const nodeEnv = environment.NODE_ENV ?? 'development';
  const mongoUri = environment.MONGODB_URI?.trim() || '';
  const useMemory = environment.USE_IN_MEMORY_DB === 'true' || (!mongoUri && nodeEnv !== 'production');

  return {
    nodeEnv,
    port: parsePort(environment.PORT),
    mongoUri,
    mongoDatabase: environment.MONGODB_DATABASE?.trim() || 'student_registry',
    useMemory
  };
}
