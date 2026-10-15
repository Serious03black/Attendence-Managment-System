import { Notification } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly, page = 1, limit = 20 } = req.query;

  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const skip = (Number(page) - 1) * Number(limit);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { notifications, total, unreadCount, page: Number(page), pages: Math.ceil(total / Number(limit)) }, 'Notifications fetched.')
  );
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id }, // scoped to the requester so you can't mark someone else's as read
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) throw ApiError.notFound('Notification not found.');
  return res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read.'));
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read.'));
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const result = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  if (!result) throw ApiError.notFound('Notification not found.');
  return res.status(200).json(new ApiResponse(200, null, 'Notification deleted.'));
});
