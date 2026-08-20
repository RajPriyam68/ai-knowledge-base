import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { bootstrapAdmin } from "./services/auth.service.js";
import { prisma } from "./config/database.js";
import { startScheduledJobs } from "./jobs/index.js";

async function main() {
  const app = createApp();

  try {
    await prisma.$connect();
    logger.info("[Server] Database connection established");
  } catch (error) {
    logger.error("[Server] Failed to connect to database", error);
    process.exit(1);
  }

  try {
    await bootstrapAdmin();
  } catch (error) {
    logger.error("[Server] Failed to bootstrap admin", error);
  }

  startScheduledJobs();

  const server = app.listen(env.PORT, () => {
    logger.info(`[Server] API running on http://localhost:${env.PORT}`);
    logger.info(`[Server] Environment: ${env.NODE_ENV}`);
    logger.info(
      `[Server] AI provider: ${env.GEMINI_API_KEY ? "gemini-2.5-flash" : "offline demo mode"}`,
    );
  });

  const shutdown = async (signal: string) => {
    logger.info(`[Server] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  logger.error("[Server] Fatal error during startup", error);
  process.exit(1);
});
