import {
  createNotification,
  countUnread,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../repositories/notification.repo.js";

export async function notifyUser(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
}) {
  try {
    await createNotification(params);
  } catch (error) {
    // notifications are best-effort
    console.error("[Notification] failed to create", error);
  }
}

export async function notifyDocumentProcessed(userId: string, documentName: string) {
  await notifyUser({
    userId,
    type: "DOCUMENT",
    title: "Document processed",
    message: `"${documentName}" has been processed and is ready to chat with.`,
  });
}

export async function notifyDocumentFailed(userId: string, documentName: string, reason: string) {
  await notifyUser({
    userId,
    type: "DOCUMENT",
    title: "Document processing failed",
    message: `"${documentName}" could not be processed: ${reason}`,
  });
}

export { countUnread, listNotifications, markAllNotificationsRead, markNotificationRead };
