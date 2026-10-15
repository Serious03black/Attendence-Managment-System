import { Announcement, Enrollment } from '../models/index.js';
import { notifyMany } from '../services/notification.service.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, body, audience, targetBatch, isPinned, expiresAt } = req.body;

  if (audience === 'batch' && !targetBatch) {
    throw ApiError.badRequest('targetBatch is required when audience is "batch".');
  }

  const announcement = await Announcement.create({
    title,
    body,
    createdBy: req.user._id,
    audience,
    targetBatch: audience === 'batch' ? targetBatch : undefined,
    isPinned,
    expiresAt,
  });

  // Fan out a notification based on audience scope.
  let recipientIds = [];
  if (audience === 'all') {
    recipientIds = await User.find({ isActive: true }).distinct('_id');
  } else if (audience === 'faculty') {
    recipientIds = await User.find({ role: 'faculty', isActive: true }).distinct('_id');
  } else if (audience === 'students') {
    recipientIds = await User.find({ role: 'student', isActive: true }).distinct('_id');
  } else if (audience === 'batch') {
    recipientIds = await Enrollment.find({ batch: targetBatch, status: 'active' }).distinct('student');
  }

  await notifyMany(recipientIds, {
    type: 'announcement',
    title: `Announcement: ${title}`,
    message: body.slice(0, 140),
    link: '/announcements',
    relatedEntity: { entityType: 'Announcement', entityId: announcement._id },
  });

  return res.status(201).json(new ApiResponse(201, announcement, 'Announcement published.'));
});

/** Returns announcements relevant to the requesting user's role/batches. */
export const getAnnouncements = asyncHandler(async (req, res) => {
  const now = new Date();
  const baseFilter = { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }] };

  let audienceFilter;
  if (req.user.role === 'admin') {
    audienceFilter = {}; // admin sees everything
  } else if (req.user.role === 'faculty') {
    audienceFilter = { audience: { $in: ['all', 'faculty'] } };
  } else {
    const myBatchIds = await Enrollment.find({ student: req.user._id, status: 'active' }).distinct('batch');
    audienceFilter = {
      $or: [{ audience: { $in: ['all', 'students'] } }, { audience: 'batch', targetBatch: { $in: myBatchIds } }],
    };
  }

  const announcements = await Announcement.find({ ...baseFilter, ...audienceFilter })
    .populate('createdBy', 'fullName role')
    .sort({ isPinned: -1, createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, announcements, 'Announcements fetched.'));
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found.');
  if (req.user.role !== 'admin' && String(announcement.createdBy) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only delete your own announcements.');
  }
  await announcement.deleteOne();
  return res.status(200).json(new ApiResponse(200, null, 'Announcement deleted.'));
});
