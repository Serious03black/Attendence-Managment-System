import { Notification } from '../models/index.js';
import { getIO } from '../sockets/index.js';
import { logger } from '../utils/logger.js';

/**
 * Single entry point for "notify a user of something." Always writes the
 * persistent Notification doc first (so it's there on next login even if
 * the user is offline), then best-effort emits a Socket.IO event to their
 * room for instant in-app delivery. Socket emission failures are logged
 * but never block the calling flow — a failed push notification should
 * never roll back an attendance approval.
 */
export async function notify({ recipient, type, title, message, link, relatedEntity }) {
  const notification = await Notification.create({
    recipient,
    type,
    title,
    message,
    link,
    relatedEntity,
  });

  try {
    const io = getIO();
    io.to(`user:${recipient}`).emit('notification:new', notification);
  } catch (err) {
    logger.warn(`Socket emit failed for notification ${notification._id}: ${err.message}`);
  }

  return notification;
}

/** Fan-out helper for batch-wide notifications (e.g. "new report uploaded"
 * visible to every enrolled student) without the caller looping manually. */
export async function notifyMany(recipientIds, payload) {
  return Promise.all(recipientIds.map((recipient) => notify({ ...payload, recipient })));
}
