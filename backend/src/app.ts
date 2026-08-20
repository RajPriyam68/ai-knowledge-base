import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { API_PREFIX } from "./config/constants.js";
import { ensureUploadDirSync } from "./storage/file.storage.js";
import { requestId } from "./middleware/requestId.js";
import { globalLimiter } from "./middleware/rateLimiter.js";
import { apiUsageTracker, errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/index.js";
import healthRoutes from "./routes/health.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  ensureUploadDirSync();

  app.use(requestId);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  const corsOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim());
  app.use(
    cors({
      origin: corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => logger.debug(message.trim()),
      },
      skip: () => env.NODE_ENV === "test",
    }),
  );

  app.use(globalLimiter);
  app.use(apiUsageTracker);

  app.use("/api/health", healthRoutes);
  app.use(`${API_PREFIX}`, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
