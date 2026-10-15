import { StudentReport, Enrollment, Batch } from '../models/index.js';
import { notify } from '../services/notification.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * FACULTY: Create a student report (remarks on communication, programming
 * ability, discipline, etc). These are append-only per the brief ("become
 * a permanent part of the student's academic profile") — there is
 * deliberately no updateStudentReport export. A correction is issued as a
 * new report, not an edit to history.
 */
export const createStudentReport = asyncHandler(async (req, res) => {
  const {
    student: studentId,
    batch: batchId,
    reportPeriod,
    communicationSkills,
    programmingAbility,
    attendanceDiscipline,
    assignmentCompletion,
    codingSkills,
    confidence,
    behavior,
    technicalUnderstanding,
    overallPerformance,
    summary,
  } = req.body;

  const batch = await Batch.findById(batchId);
  if (!batch) throw ApiError.notFound('Batch not found.');
  if (req.user.role === 'faculty' && String(batch.assignedFaculty) !== String(req.user._id)) {
    throw ApiError.forbidden('You are not the assigned faculty for this batch.');
  }

  const enrolled = await Enrollment.exists({ student: studentId, batch: batchId, status: 'active' });
  if (!enrolled) throw ApiError.badRequest('This student is not actively enrolled in the given batch.');

  const report = await StudentReport.create({
    student: studentId,
    batch: batchId,
    reportedBy: req.user._id,
    reportPeriod,
    communicationSkills,
    programmingAbility,
    attendanceDiscipline,
    assignmentCompletion,
    codingSkills,
    confidence,
    behavior,
    technicalUnderstanding,
    overallPerformance,
    summary,
  });

  await notify({
    recipient: studentId,
    type: 'remark_added',
    title: 'New faculty report added',
    message: `Your trainer has added a new performance report for ${batch.name}.`,
    link: `/student/profile/reports`,
    relatedEntity: { entityType: 'StudentReport', entityId: report._id },
  });

  return res.status(201).json(new ApiResponse(201, report, 'Student report created.'));
});

/** All reports for a student, most recent first — the profile page feed. */
export const getStudentReports = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  if (req.user.role === 'student' && String(req.user._id) !== studentId) {
    throw ApiError.forbidden('You can only view your own reports.');
  }

  const reports = await StudentReport.find({ student: studentId })
    .populate('reportedBy', 'fullName')
    .populate('batch', 'name batchCode')
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, reports, 'Student reports fetched.'));
});
