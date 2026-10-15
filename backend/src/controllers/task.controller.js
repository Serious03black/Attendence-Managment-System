import { Task, Submission, Batch, Enrollment } from '../models/index.js';
import { uploadManyToCloudinary } from '../services/upload.service.js';
import { notify, notifyMany } from '../services/notification.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    type,
    batch: batchId,
    scope,
    studentIds,
    priority,
    difficulty,
    deadline,
    maxMarks,
    referenceLinks,
    submissionRequirements,
  } = req.body;

  const batch = await Batch.findById(batchId);
  if (!batch) throw ApiError.notFound('Batch not found.');
  if (req.user.role === 'faculty' && String(batch.assignedFaculty) !== String(req.user._id)) {
    throw ApiError.forbidden('You are not the assigned faculty for this batch.');
  }

  if (scope === 'individual' && (!studentIds || studentIds.length === 0)) {
    throw ApiError.badRequest('studentIds must be provided when scope is "individual".');
  }

  let attachments = [];
  if (req.files?.length) {
    attachments = await uploadManyToCloudinary(req.files, `sti-ms/tasks/${batchId}`);
  }

  const task = await Task.create({
    title,
    description,
    type,
    batch: batchId,
    createdBy: req.user._id,
    assignedTo: { scope, students: scope === 'individual' ? studentIds : [] },
    priority,
    difficulty,
    deadline,
    maxMarks,
    referenceLinks,
    attachments,
    submissionRequirements,
  });

  const recipientIds =
    scope === 'individual' ? studentIds : await Enrollment.find({ batch: batchId, status: 'active' }).distinct('student');

  await notifyMany(recipientIds, {
    type: 'task_assigned',
    title: 'New task assigned',
    message: `"${title}" has been assigned. Deadline: ${new Date(deadline).toLocaleDateString()}.`,
    link: `/student/tasks/${task._id}`,
    relatedEntity: { entityType: 'Task', entityId: task._id },
  });

  return res.status(201).json(new ApiResponse(201, task, 'Task created and assigned.'));
});

/** STUDENT: Tasks visible to me — either batch-wide for a batch I'm in, or individually assigned. */
export const getMyTasks = asyncHandler(async (req, res) => {
  const { status, priority } = req.query;

  const myActiveBatchIds = await Enrollment.find({ student: req.user._id, status: 'active' }).distinct('batch');

  const filter = {
    $or: [
      { batch: { $in: myActiveBatchIds }, 'assignedTo.scope': 'batch' },
      { 'assignedTo.scope': 'individual', 'assignedTo.students': req.user._id },
    ],
    status: { $ne: 'draft' },
  };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const tasks = await Task.find(filter).populate('batch', 'name batchCode').sort({ deadline: 1 });

  // Attach this student's own submission (if any) to each task so the
  // frontend doesn't need a second round trip per task.
  const submissions = await Submission.find({ task: { $in: tasks.map((t) => t._id) }, student: req.user._id });
  const byTask = new Map(submissions.map((s) => [String(s.task), s]));

  const withSubmissionStatus = tasks.map((task) => ({
    ...task.toObject(),
    mySubmission: byTask.get(String(task._id)) || null,
  }));

  return res.status(200).json(new ApiResponse(200, withSubmissionStatus, 'Tasks fetched.'));
});

export const getBatchTasks = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const batch = await Batch.findById(batchId);
  if (!batch) throw ApiError.notFound('Batch not found.');
  if (req.user.role === 'faculty' && String(batch.assignedFaculty) !== String(req.user._id)) {
    throw ApiError.forbidden('You do not manage this batch.');
  }

  const tasks = await Task.find({ batch: batchId }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, tasks, 'Batch tasks fetched.'));
});

/** STUDENT: Submit work for a task. */
export const submitTask = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const task = await Task.findById(req.params.taskId);
  if (!task) throw ApiError.notFound('Task not found.');

  const isVisible =
    (task.assignedTo.scope === 'batch' && (await Enrollment.exists({ student: req.user._id, batch: task.batch, status: 'active' }))) ||
    (task.assignedTo.scope === 'individual' && task.assignedTo.students.some((s) => String(s) === String(req.user._id)));
  if (!isVisible) throw ApiError.forbidden('This task is not assigned to you.');

  const existing = await Submission.findOne({ task: task._id, student: req.user._id });
  if (existing) throw ApiError.conflict('You have already submitted this task. Contact faculty to resubmit.');

  let attachments = [];
  if (req.files?.length) {
    attachments = await uploadManyToCloudinary(req.files, `sti-ms/submissions/${task._id}`);
  }

  const submission = await Submission.create({
    task: task._id,
    student: req.user._id,
    content,
    attachments,
    isLate: new Date() > new Date(task.deadline),
  });

  await notify({
    recipient: task.createdBy,
    type: 'task_assigned',
    title: 'New task submission',
    message: `${req.user.fullName} submitted "${task.title}".`,
    link: `/faculty/tasks/${task._id}/submissions`,
    relatedEntity: { entityType: 'Submission', entityId: submission._id },
  });

  return res.status(201).json(new ApiResponse(201, submission, 'Task submitted successfully.'));
});

/** FACULTY: Grade a submission. */
export const gradeSubmission = asyncHandler(async (req, res) => {
  const { marksObtained, feedback, status } = req.body; // status: 'graded' | 'returned-for-revision'

  const submission = await Submission.findById(req.params.submissionId).populate('task');
  if (!submission) throw ApiError.notFound('Submission not found.');
  if (req.user.role === 'faculty' && String(submission.task.createdBy) !== String(req.user._id)) {
    throw ApiError.forbidden('You did not create this task.');
  }
  if (marksObtained !== undefined && marksObtained > submission.task.maxMarks) {
    throw ApiError.badRequest(`marksObtained cannot exceed maxMarks (${submission.task.maxMarks}).`);
  }

  submission.marksObtained = marksObtained;
  submission.feedback = feedback;
  submission.status = status || 'graded';
  submission.gradedBy = req.user._id;
  submission.gradedAt = new Date();
  await submission.save();

  await notify({
    recipient: submission.student,
    type: 'task_graded',
    title: 'Task graded',
    message: `"${submission.task.title}" has been graded: ${marksObtained}/${submission.task.maxMarks}.`,
    link: `/student/tasks/${submission.task._id}`,
    relatedEntity: { entityType: 'Submission', entityId: submission._id },
  });

  return res.status(200).json(new ApiResponse(200, submission, 'Submission graded.'));
});

export const getTaskSubmissions = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) throw ApiError.notFound('Task not found.');
  if (req.user.role === 'faculty' && String(task.createdBy) !== String(req.user._id)) {
    throw ApiError.forbidden('You did not create this task.');
  }

  const submissions = await Submission.find({ task: task._id })
    .populate('student', 'fullName email studentDetails.rollNumber avatar')
    .sort({ submittedAt: -1 });

  return res.status(200).json(new ApiResponse(200, submissions, 'Submissions fetched.'));
});
