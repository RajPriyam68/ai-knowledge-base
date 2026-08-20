import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { deleteExpiredSessions } from "../repositories/session.repo.js";
import { clearSystemLogs } from "../repositories/system-log.repo.js";
import { getStorageUsage } from "../storage/file.storage.js";

export function startScheduledJobs(): void {
  const intervalMs = env.JOB_CLEANUP_INTERVAL_MINUTES * 60 * 1000;

  const cleanupJob = setInterval(async () => {
    try {
      const removedSessions = await deleteExpiredSessions();
      if (removedSessions > 0) {
        logger.info(`[Jobs] Removed ${removedSessions} expired sessions`);
      }
    } catch (error) {
      logger.error("[Jobs] Session cleanup failed", error);
    }

    try {
      const storage = await getStorageUsage();
      if (storage.bytes > 0) {
        logger.debug(`[Jobs] Storage usage: ${storage.bytes} bytes (${storage.fileCount} files)`);
      }
    } catch {
      /* ignore */
    }
  }, intervalMs);

  const logCleanupJob = setInterval(async () => {
    try {
      const removed = await clearSystemLogs(30);
      if (removed > 0) {
        logger.info(`[Jobs] Purged ${removed} system logs older than 30 days`);
      }
    } catch (error) {
      logger.error("[Jobs] Log cleanup failed", error);
    }
  }, intervalMs * 4);

  cleanupJob.unref();
  logCleanupJob.unref();
}
