import { DailyReport, Lecture, Batch, Enrollment } from '../models/index.js';
import { uploadManyToCloudinary } from '../services/upload.service.js';
import { notifyMany } from '../services/notification.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * FACULTY: Create the daily teaching report for a lecture. On success,
 * fans out a notification to every actively-enrolled student in the batch
 * — this is what makes the report "automatically appear on the respective
 * students' dashboards" per the brief, without duplicating the report doc
 * per student (students query by `batch`, not by a per-student copy).
 */
export const createDailyReport = asyncHandler(async (req, res) => {
  const {
    lectureId,
    topicCovered,
    subtopics,
    teachingHours,
    studentParticipation,
    assignmentsGiven,
    homework,
    references,
    notes,
    upcomingTopics,
    remarks,
    overallBatchPerformance,
  } = req.body;

  const lecture = await Lecture.findById(lectureId).populate('batch');
  if (!lecture) throw ApiError.notFound('Lecture not found.');

  if (req.user.role === 'faculty' && String(lecture.batch.assignedFaculty) !== String(req.user._id)) {
    throw ApiError.forbidden('You are not the assigned faculty for this batch.');
  }

  const alreadyExists = await DailyReport.findOne({ lecture: lectureId });
  if (alreadyExists) throw ApiError.conflict('A daily report already exists for this lecture. Use update instead.');

  let attachments = [];
  if (req.files?.length) {
    attachments = await uploadManyToCloudinary(req.files, `sti-ms/daily-reports/${lecture.batch._id}`);
  }

  const report = await DailyReport.create({
    lecture: lectureId,
    batch: lecture.batch._id,
    faculty: req.user._id,
    date: lecture.date,
    topicCovered,
    subtopics,
    teachingHours,
    studentParticipation,
    assignmentsGiven,
    homework,
    references,
    notes,
    attachments,
    upcomingTopics,
    remarks,
    overallBatchPerformance,
  });

  // Mark the lecture completed now that a report exists for it.
  if (lecture.status === 'scheduled') {
    lecture.status = 'completed';
    await lecture.save();
  }

  const studentIds = await Enrollment.find({ batch: lecture.batch._id, status: 'active' }).distinct('student');
  await notifyMany(studentIds, {
    type: 'report_uploaded',
    title: 'New teaching report available',
    message: `A new report for "${topicCovered}" has been posted in ${lecture.batch.name}.`,
    link: `/student/batches/${lecture.batch._id}/reports/${report._id}`,
    relatedEntity: { entityType: 'DailyReport', entityId: report._id },
  });

  return res.status(201).json(new ApiResponse(201, report, 'Daily report created and shared with students.'));
});

export const updateDailyReport = asyncHandler(async (req, res) => {
  const report = await DailyReport.findById(req.params.id).populate('batch');
  if (!report) throw ApiError.notFound('Daily report not found.');

  if (req.user.role === 'faculty' && String(report.faculty) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only edit your own reports.');
  }

  const editableFields = [
    'topicCovered',
    'subtopics',
    'teachingHours',
    'studentParticipation',
    'assignmentsGiven',
    'homework',
    'references',
    'notes',
    'upcomingTopics',
    'remarks',
    'overallBatchPerformance',
  ];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) report[field] = req.body[field];
  });

  if (req.files?.length) {
    const newAttachments = await uploadManyToCloudinary(req.files, `sti-ms/daily-reports/${report.batch._id}`);
    report.attachments.push(...newAttachments);
  }

  await report.save();
  return res.status(200).json(new ApiResponse(200, report, 'Daily report updated.'));
});

/** Batch's chronological learning timeline: every report in date order. */
export const getBatchTimeline = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  const batch = await Batch.findById(batchId);
  if (!batch) throw ApiError.notFound('Batch not found.');

  if (req.user.role === 'student') {
    const enrolled = await Enrollment.exists({ student: req.user._id, batch: batchId, status: 'active' });
    if (!enrolled) throw ApiError.forbidden('You are not enrolled in this batch.');
  }
  if (req.user.role === 'faculty' && String(batch.assignedFaculty) !== String(req.user._id)) {
    throw ApiError.forbidden('You do not manage this batch.');
  }

  const reports = await DailyReport.find({ batch: batchId })
    .populate('faculty', 'fullName')
    .populate('lecture', 'date startTime endTime status')
    .sort({ date: 1 });

  return res.status(200).json(new ApiResponse(200, reports, 'Batch learning timeline fetched.'));
});

/** STUDENT: All reports across all of the student's enrolled batches, for their dashboard feed. */
export const getStudentReportFeed = asyncHandler(async (req, res) => {
  const batchIds = await Enrollment.find({ student: req.user._id, status: 'active' }).distinct('batch');

  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [reports, total] = await Promise.all([
    DailyReport.find({ batch: { $in: batchIds } })
      .populate('faculty', 'fullName')
      .populate('batch', 'name batchCode')
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit)),
    DailyReport.countDocuments({ batch: { $in: batchIds } }),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { reports, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }, 'Report feed fetched.'));
});
