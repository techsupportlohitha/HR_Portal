import app from './app';
import { config } from './config';
import prisma from './config/database';
import { cleanupDepartments } from './cleanup';

const startServer = async () => {
  try {
    await prisma.$connect();
    await cleanupDepartments();
    app.listen(config.port, () => {
      console.log(`
🚀 HR Management API Server`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Port: ${config.port}`);
      console.log(`   URL: http://localhost:${config.port}`);
      console.log(`   Liveness: http://localhost:${config.port}/api/live`);
      console.log(`   Readiness: http://localhost:${config.port}/api/ready
`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
