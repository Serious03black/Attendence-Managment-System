import { Batch, Course, User, Enrollment, Lecture } from '../models/index.js';
import {
  detectBatchConflicts,
  detectStudentConflicts,
  generateLectureOccurrences,
  resolveWeekdays,
} from '../services/scheduler.service.js';
import { notify } from '../services/notification.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Creates a batch. This is the single most business-logic-heavy write
 * endpoint in the system:
 *   1. Validate the course and faculty actually exist and faculty has the right role.
 *   2. Resolve weekdays for the chosen recurrence pattern.
 *   3. Run conflict detection (faculty + classroom) BEFORE saving anything.
 *   4. If a `force` flag isn't set and conflicts exist, return 409 with the
 *      conflict list so the frontend can show a warning and let an admin
 *      override deliberately, rather than silently blocking.
 *   5. Persist the Batch, then materialize its Lecture occurrences.
 */
export const createBatch = asyncHandler(async (req, res) => {
  const {
    name,
    batchCode,
    course,
    assignedFaculty,
    mode,
    roomId,
    onlineMeetingLink,
    recurrencePattern,
    weekdays,
    startTime,
    endTime,
    batchStartDate,
    batchEndDate,
    maxCapacity,
    force, // admin explicitly acknowledges conflicts and wants to proceed anyway
  } = req.body;

  const [courseDoc, facultyDoc] = await Promise.all([
    Course.findById(course),
    User.findOne({ _id: assignedFaculty, role: 'faculty' }),
  ]);
  if (!courseDoc) throw ApiError.notFound('Course not found.');
  if (!facultyDoc) throw ApiError.notFound('Faculty not found or the given user is not a faculty member.');

  const resolvedWeekdays = resolveWeekdays(recurrencePattern, weekdays);

  const proposed = {
    assignedFaculty,
    roomId,
    mode,
    weekdays: resolvedWeekdays,
    startTime,
    endTime,
    batchStartDate: new Date(batchStartDate),
    batchEndDate: new Date(batchEndDate),
  };

  const conflicts = await detectBatchConflicts(proposed);
  if (conflicts.length > 0 && !force) {
    // 409 (not 400): the request is well-formed, it conflicts with existing
    // state. Frontend shows these and offers a "create anyway" confirm,
    // which resubmits with force: true.
    throw new ApiError(409, 'Scheduling conflicts detected.', conflicts);
  }

  const batch = await Batch.create({
    name,
    batchCode,
    course,
    assignedFaculty,
    mode,
    roomId,
    onlineMeetingLink,
    recurrencePattern,
    weekdays: resolvedWeekdays,
    startTime,
    endTime,
    batchStartDate,
    batchEndDate,
    maxCapacity,
    createdBy: req.user._id,
  });

  const lectures = await generateLectureOccurrences(batch);

  await notify({
    recipient: assignedFaculty,
    type: 'batch_assigned',
    title: 'New batch assigned',
    message: `You have been assigned to teach "${batch.name}" (${batch.batchCode}).`,
    link: `/faculty/batches/${batch._id}`,
    relatedEntity: { entityType: 'Batch', entityId: batch._id },
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      { batch, lecturesGenerated: lectures.length, conflictsOverridden: conflicts },
      conflicts.length > 0
        ? `Batch created with ${conflicts.length} overridden conflict(s).`
        : 'Batch created successfully.'
    )
  );
});

/**
 * Dry-run conflict check — lets the frontend show a live warning banner
 * as the admin fills out the batch form, before they hit submit.
 */
export const checkBatchConflicts = asyncHandler(async (req, res) => {
  const { assignedFaculty, roomId, mode, recurrencePattern, weekdays, startTime, endTime, batchStartDate, batchEndDate, excludeBatchId } =
    req.body;

  const resolvedWeekdays = resolveWeekdays(recurrencePattern, weekdays);

  const conflicts = await detectBatchConflicts({
    _id: excludeBatchId,
    assignedFaculty,
    roomId,
    mode,
    weekdays: resolvedWeekdays,
    startTime,
    endTime,
    batchStartDate: new Date(batchStartDate),
    batchEndDate: new Date(batchEndDate),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { hasConflicts: conflicts.length > 0, conflicts }, 'Conflict check complete.'));
});

export const getBatches = asyncHandler(async (req, res) => {
  const { status, course, faculty, mode, page = 1, limit = 20, search } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (course) filter.course = course;
  if (faculty) filter.assignedFaculty = faculty;
  if (mode) filter.mode = mode;
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { batchCode: new RegExp(search, 'i') }];

  // Faculty can only ever see their own batches, regardless of query params
  // they send — enforced server-side, not just hidden in the UI.
  if (req.user.role === 'faculty') filter.assignedFaculty = req.user._id;

  const skip = (Number(page) - 1) * Number(limit);

  const [batches, total] = await Promise.all([
    Batch.find(filter)
      .populate('course', 'name code')
      .populate('assignedFaculty', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Batch.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { batches, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }, 'Batches fetched.')
  );
});

export const getBatchById = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id)
    .populate('course')
    .populate('assignedFaculty', 'fullName email phone')
    .populate({
      path: 'enrollments',
      match: { status: 'active' },
      populate: { path: 'student', select: 'fullName email studentDetails.rollNumber' },
    });

  if (!batch) throw ApiError.notFound('Batch not found.');

  if (req.user.role === 'faculty' && String(batch.assignedFaculty._id) !== String(req.user._id)) {
    throw ApiError.forbidden('You do not have access to this batch.');
  }

  return res.status(200).json(new ApiResponse(200, batch, 'Batch fetched.'));
});

export const updateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) throw ApiError.notFound('Batch not found.');

  // Scheduling fields are NOT editable via this generic update — changing
  // weekdays/times/dates after lectures exist would desync the already-
  // materialized Lecture documents. A dedicated "reschedule" flow (which
  // would regenerate future lectures and re-run conflict detection) is the
  // correct extension point for that; kept out of scope here to avoid
  // silently corrupting attendance history tied to existing lectures.
  const { name, status, maxCapacity, onlineMeetingLink } = req.body;
  if (name !== undefined) batch.name = name;
  if (status !== undefined) batch.status = status;
  if (maxCapacity !== undefined) batch.maxCapacity = maxCapacity;
  if (onlineMeetingLink !== undefined) batch.onlineMeetingLink = onlineMeetingLink;

  await batch.save();
  return res.status(200).json(new ApiResponse(200, batch, 'Batch updated.'));
});

export const deleteBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) throw ApiError.notFound('Batch not found.');

  const activeEnrollmentCount = await Enrollment.countDocuments({ batch: batch._id, status: 'active' });
  if (activeEnrollmentCount > 0) {
    throw ApiError.conflict(
      `Cannot delete a batch with ${activeEnrollmentCount} active student(s) enrolled. Transfer or drop them first.`
    );
  }

  await Promise.all([Lecture.deleteMany({ batch: batch._id }), batch.deleteOne()]);
  return res.status(200).json(new ApiResponse(200, null, 'Batch deleted.'));
});

/**
 * Enroll a student into a batch: capacity check, student-side schedule
 * conflict check, then create the Enrollment.
 */
export const enrollStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const batch = await Batch.findById(req.params.id);
  if (!batch) throw ApiError.notFound('Batch not found.');

  const student = await User.findOne({ _id: studentId, role: 'student' });
  if (!student) throw ApiError.notFound('Student not found.');

  const currentCount = await Enrollment.countDocuments({ batch: batch._id, status: 'active' });
  if (currentCount >= batch.maxCapacity) {
    throw ApiError.conflict(`Batch is at full capacity (${batch.maxCapacity}).`);
  }

  const alreadyEnrolled = await Enrollment.findOne({ student: studentId, batch: batch._id, status: 'active' });
  if (alreadyEnrolled) throw ApiError.conflict('Student is already enrolled in this batch.');

  const conflicts = await detectStudentConflicts(studentId, batch);
  if (conflicts.length > 0 && !req.body.force) {
    throw new ApiError(409, 'Student has a scheduling conflict with an existing batch.', conflicts);
  }

  const enrollment = await Enrollment.create({
    student: studentId,
    batch: batch._id,
    enrolledBy: req.user._id,
  });

  await notify({
    recipient: studentId,
    type: 'batch_assigned',
    title: 'Enrolled in a new batch',
    message: `You have been enrolled in "${batch.name}" (${batch.batchCode}).`,
    link: `/student/batches/${batch._id}`,
    relatedEntity: { entityType: 'Batch', entityId: batch._id },
  });

  return res.status(201).json(new ApiResponse(201, enrollment, 'Student enrolled successfully.'));
});

/**
 * Change a student's batch: marks the old enrollment 'transferred' and
 * creates a fresh active enrollment in the new batch, preserving history
 * instead of mutating the old record in place.
 */
export const transferStudent = asyncHandler(async (req, res) => {
  const { studentId, fromBatchId, toBatchId } = req.body;

  const [oldEnrollment, newBatch] = await Promise.all([
    Enrollment.findOne({ student: studentId, batch: fromBatchId, status: 'active' }),
    Batch.findById(toBatchId),
  ]);
  if (!oldEnrollment) throw ApiError.notFound('Active enrollment not found for this student in the source batch.');
  if (!newBatch) throw ApiError.notFound('Target batch not found.');

  const currentCount = await Enrollment.countDocuments({ batch: toBatchId, status: 'active' });
  if (currentCount >= newBatch.maxCapacity) throw ApiError.conflict('Target batch is at full capacity.');

  const newEnrollment = await Enrollment.create({
    student: studentId,
    batch: toBatchId,
    enrolledBy: req.user._id,
  });

  oldEnrollment.status = 'transferred';
  oldEnrollment.transferredTo = toBatchId;
  await oldEnrollment.save();

  await notify({
    recipient: studentId,
    type: 'batch_assigned',
    title: 'Batch changed',
    message: `You have been transferred to "${newBatch.name}" (${newBatch.batchCode}).`,
    link: `/student/batches/${newBatch._id}`,
    relatedEntity: { entityType: 'Batch', entityId: newBatch._id },
  });

  return res.status(200).json(new ApiResponse(200, newEnrollment, 'Student transferred successfully.'));
});
