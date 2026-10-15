import { Attendance, Lecture, Batch, Enrollment } from '../models/index.js';
import { getMonthlyAttendanceSummary, getAttendanceCalendar } from '../services/attendance.service.js';
import { notify } from '../services/notification.service.js';
import { getIO } from '../sockets/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * STUDENT: Self-mark attendance for a lecture. Creates a 'pending_approval'
 * record — never writes directly to 'present'. This is the entry point to
 * the approval state machine described in Attendance.model.js.
 */
export const submitAttendance = asyncHandler(async (req, res) => {
  const { lectureId, status, submittedLocation } = req.body; // status: 'present' | 'absent' | 'leave' | 'late' (student's own claim)

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) throw ApiError.notFound('Lecture not found.');
  if (['cancelled', 'holiday'].includes(lecture.status)) {
    throw ApiError.badRequest('Attendance cannot be marked for a cancelled lecture or holiday.');
  }

  // Confirm the student is actually enrolled in this lecture's batch —
  // prevents marking attendance for a batch they don't belong to.
  const enrollment = await Enrollment.findOne({ student: req.user._id, batch: lecture.batch, status: 'active' });
  if (!enrollment) throw ApiError.forbidden('You are not enrolled in the batch for this lecture.');

  const existing = await Attendance.findOne({ student: req.user._id, lecture: lectureId });
  if (existing) throw ApiError.conflict('Attendance has already been submitted for this lecture.');

  if (!['present', 'absent', 'leave', 'late'].includes(status)) {
    throw ApiError.badRequest('status must be one of present/absent/leave/late.');
  }

  // Every self-submission starts as 'pending_approval' regardless of what
  // the student claims — the brief treats Pending Approval as its own
  // distinct status. The student's claimed value is preserved in
  // `claimedStatus` so faculty sees what the student asserted while
  // reviewing; the authoritative `status` only becomes present/absent/
  // leave/late once a faculty member approves it (see reviewAttendance,
  // the only place that sets isApproved: true).
  const attendance = await Attendance.create({
    student: req.user._id,
    lecture: lectureId,
    batch: lecture.batch,
    status: 'pending_approval',
    claimedStatus: status,
    isApproved: false,
    submittedLocation,
  });

  // Push to faculty's live approval queue for this batch.
  try {
    getIO().to(`batch:${lecture.batch}`).emit('attendance:new-pending', {
      attendanceId: attendance._id,
      batchId: lecture.batch,
      studentId: req.user._id,
    });
  } catch {
    /* socket not critical path */
  }

  return res.status(201).json(new ApiResponse(201, attendance, 'Attendance submitted and pending faculty approval.'));
});

/**
 * FACULTY: List all pending attendance requests for batches this faculty
 * teaches. This is the "Faculty dashboard ... pending attendance requests" view.
 */
export const getPendingApprovals = asyncHandler(async (req, res) => {
  const { batchId } = req.query;

  const facultyBatchIds = batchId
    ? [batchId]
    : await Batch.find({ assignedFaculty: req.user._id }).distinct('_id');

  // If a specific batchId was requested, confirm ownership.
  if (batchId) {
    const owns = await Batch.exists({ _id: batchId, assignedFaculty: req.user._id });
    if (!owns && req.user.role === 'faculty') throw ApiError.forbidden('You do not manage this batch.');
  }

  const pending = await Attendance.find({ batch: { $in: facultyBatchIds }, status: 'pending_approval' })
    .populate('student', 'fullName email studentDetails.rollNumber avatar')
    .populate('lecture', 'date startTime endTime')
    .populate('batch', 'name batchCode')
    .sort({ submittedAt: 1 }); // oldest first, so the queue behaves fairly

  return res.status(200).json(new ApiResponse(200, pending, 'Pending attendance requests fetched.'));
});

/**
 * FACULTY: Approve or reject one attendance request. This is the single
 * point in the whole system where isApproved flips to true — nothing else
 * is allowed to set it directly, keeping the percentage calculation
 * trustworthy.
 */
export const reviewAttendance = asyncHandler(async (req, res) => {
  const { action, finalStatus, remark } = req.body; // action: 'approve' | 'reject'; finalStatus required on approve: 'present'|'absent'|'leave'|'late'

  const attendance = await Attendance.findById(req.params.id).populate('batch');
  if (!attendance) throw ApiError.notFound('Attendance record not found.');
  if (attendance.status !== 'pending_approval') {
    throw ApiError.conflict(`This request has already been reviewed (current status: ${attendance.status}).`);
  }

  // Ownership check: only the faculty assigned to this batch (or an admin) may review.
  if (req.user.role === 'faculty' && String(attendance.batch.assignedFaculty) !== String(req.user._id)) {
    throw ApiError.forbidden('You are not the assigned faculty for this batch.');
  }

  if (action === 'approve') {
    // finalStatus is optional — if the faculty just clicks "approve" without
    // overriding, we honor the student's original claim. If provided, it
    // must still be a valid attendance status (lets faculty correct e.g.
    // a student who marked "present" but arrived 40 minutes late to "late").
    const resolvedStatus = finalStatus || attendance.claimedStatus;
    if (!['present', 'absent', 'leave', 'late'].includes(resolvedStatus)) {
      throw ApiError.badRequest('finalStatus must be one of present/absent/leave/late when approving.');
    }
    attendance.status = resolvedStatus;
    attendance.isApproved = true;
  } else if (action === 'reject') {
    if (!remark || !remark.trim()) {
      throw ApiError.badRequest('A remark is required when rejecting an attendance request.');
    }
    attendance.status = 'rejected';
    attendance.isApproved = false;
  } else {
    throw ApiError.badRequest("action must be 'approve' or 'reject'.");
  }

  attendance.reviewedBy = req.user._id;
  attendance.reviewedAt = new Date();
  attendance.facultyRemark = remark?.trim();
  await attendance.save();

  await notify({
    recipient: attendance.student,
    type: action === 'approve' ? 'attendance_approved' : 'attendance_rejected',
    title: action === 'approve' ? 'Attendance approved' : 'Attendance rejected',
    message:
      action === 'approve'
        ? `Your attendance was approved as "${attendance.status}".`
        : `Your attendance request was rejected. Reason: ${attendance.facultyRemark}`,
    link: `/student/attendance`,
    relatedEntity: { entityType: 'Attendance', entityId: attendance._id },
  });

  try {
    getIO().to(`user:${attendance.student}`).emit('attendance:reviewed', attendance);
  } catch {
    /* non-critical */
  }

  return res.status(200).json(new ApiResponse(200, attendance, `Attendance ${action}d successfully.`));
});

/** STUDENT: Monthly summary — Total Lectures, Attended, Absent, Leave, Pending, %. */
export const getMonthlySummary = asyncHandler(async (req, res) => {
  const { batchId, year, month } = req.query;
  if (!batchId || !year || !month) throw ApiError.badRequest('batchId, year, and month are required.');

  const studentId = req.user.role === 'student' ? req.user._id : req.query.studentId;
  if (!studentId) throw ApiError.badRequest('studentId is required for non-student callers.');

  const summary = await getMonthlyAttendanceSummary(studentId, batchId, Number(year), Number(month));
  return res.status(200).json(new ApiResponse(200, summary, 'Monthly attendance summary fetched.'));
});

/** STUDENT: Calendar view — color-coded per day. */
export const getCalendar = asyncHandler(async (req, res) => {
  const { batchId, startDate, endDate } = req.query;
  if (!batchId || !startDate || !endDate) throw ApiError.badRequest('batchId, startDate, and endDate are required.');

  const studentId = req.user.role === 'student' ? req.user._id : req.query.studentId;
  if (!studentId) throw ApiError.badRequest('studentId is required for non-student callers.');

  const calendar = await getAttendanceCalendar(studentId, batchId, new Date(startDate), new Date(endDate));
  return res.status(200).json(new ApiResponse(200, calendar, 'Attendance calendar fetched.'));
});

/** FACULTY/ADMIN: Mark a lecture as cancelled or a holiday — excludes it from attendance calculations. */
export const updateLectureStatus = asyncHandler(async (req, res) => {
  const { status, cancellationReason } = req.body; // 'completed' | 'cancelled' | 'holiday'
  const lecture = await Lecture.findById(req.params.lectureId).populate('batch');
  if (!lecture) throw ApiError.notFound('Lecture not found.');

  if (req.user.role === 'faculty' && String(lecture.batch.assignedFaculty) !== String(req.user._id)) {
    throw ApiError.forbidden('You are not the assigned faculty for this batch.');
  }

  lecture.status = status;
  if (status === 'cancelled') lecture.cancellationReason = cancellationReason;
  await lecture.save();

  return res.status(200).json(new ApiResponse(200, lecture, 'Lecture status updated.'));
});
