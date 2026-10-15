import http from 'http';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { initSocket } from './src/sockets/index.js';
import { env } from './src/config/env.js';
import { logger } from './src/utils/logger.js';

const PORT = env.port;

const server = http.createServer(app);

// Initialize Socket.io Server
initSocket(server);

// Boot application
const startServer = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    await connectDB();

    server.listen(PORT, () => {
      logger.info(`🚀 Server running in ${env.nodeEnv} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`❌ Unhandled Rejection: ${err.message}`);
  // In production, you might want to restart the process gracefully
  if (env.nodeEnv === 'production') {
    server.close(() => process.exit(1));
  }
});
