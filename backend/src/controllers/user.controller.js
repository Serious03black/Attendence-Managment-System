import { User, Enrollment, Batch, Submission, StudentReport } from '../models/index.js';
import { getMonthlyAttendanceSummary } from '../services/attendance.service.js';
import { uploadBufferToCloudinary } from '../services/upload.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** ADMIN: paginated, filterable list of students or faculty. */
export const getUsers = asyncHandler(async (req, res) => {
  const { role, search, isActive, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { fullName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { 'studentDetails.rollNumber': new RegExp(search, 'i') },
      { 'facultyDetails.employeeId': new RegExp(search, 'i') },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }, 'Users fetched.'));
});

export const getUserById = asyncHandler(async (req, res) => {
  // Students/faculty may view their own profile; only admin can view others.
  if (req.user.role !== 'admin' && String(req.user._id) !== req.params.id) {
    throw ApiError.forbidden('You can only view your own profile.');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');

  return res.status(200).json(new ApiResponse(200, user, 'User fetched.'));
});

export const updateUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && String(req.user._id) !== req.params.id) {
    throw ApiError.forbidden('You can only edit your own profile.');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');

  const selfEditableFields = ['fullName', 'phone'];
  const adminOnlyFields = ['isActive', 'facultyDetails', 'studentDetails', 'role'];

  selfEditableFields.forEach((f) => {
    if (req.body[f] !== undefined) user[f] = req.body[f];
  });
  if (req.user.role === 'admin') {
    adminOnlyFields.forEach((f) => {
      if (req.body[f] !== undefined) user[f] = req.body[f];
    });
  }

  await user.save();
  return res.status(200).json(new ApiResponse(200, user, 'User updated.'));
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  if (req.user.role !== 'admin' && String(req.user._id) !== req.params.id) {
    throw ApiError.forbidden('You can only update your own avatar.');
  }

  const result = await uploadBufferToCloudinary(req.file.buffer, {
    folder: 'sti-ms/avatars',
    originalName: req.file.originalname,
  });

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { avatar: { url: result.url, publicId: result.publicId } },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, user, 'Avatar updated.'));
});

/** ADMIN: deactivate rather than hard-delete, to preserve historical attendance/report integrity. */
export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) throw ApiError.notFound('User not found.');
  return res.status(200).json(new ApiResponse(200, user, 'User deactivated.'));
});

export const reactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!user) throw ApiError.notFound('User not found.');
  return res.status(200).json(new ApiResponse(200, user, 'User reactivated.'));
});

/**
 * Full composite student profile: personal details + batches + attendance
 * + tasks + reports + certificates in one payload, matching the brief's
 * "Student Profile displaying personal details, enrolled batches, assigned
 * trainer, attendance percentage... " requirement. Assembled from several
 * collections rather than embedding all of this on the User doc, so each
 * piece (attendance, submissions, reports) stays independently queryable
 * and doesn't bloat the core user record.
 */
export const getStudentProfile = asyncHandler(async (req, res) => {
  const studentId = req.params.id;

  if (req.user.role === 'student' && String(req.user._id) !== studentId) {
    throw ApiError.forbidden('You can only view your own profile.');
  }
  if (req.user.role === 'faculty') {
    const myBatchIds = await Batch.find({ assignedFaculty: req.user._id }).distinct('_id');
    const teachesThisStudent = await Enrollment.exists({
      student: studentId,
      status: 'active',
      batch: { $in: myBatchIds },
    });
    if (!teachesThisStudent) throw ApiError.forbidden('This student is not in any of your batches.');
  }

  const student = await User.findOne({ _id: studentId, role: 'student' });
  if (!student) throw ApiError.notFound('Student not found.');

  const enrollments = await Enrollment.find({ student: studentId, status: 'active' })
    .populate({ path: 'batch', populate: [{ path: 'course', select: 'name code' }, { path: 'assignedFaculty', select: 'fullName email' }] });

  const now = new Date();
  const attendanceByBatch = await Promise.all(
    enrollments.map(async (e) => ({
      batchId: e.batch._id,
      batchName: e.batch.name,
      summary: await getMonthlyAttendanceSummary(studentId, e.batch._id, now.getFullYear(), now.getMonth() + 1),
    }))
  );

  const [submissions, reports] = await Promise.all([
    Submission.find({ student: studentId }).populate('task', 'title maxMarks deadline').sort({ submittedAt: -1 }).limit(20),
    StudentReport.find({ student: studentId }).populate('reportedBy', 'fullName').populate('batch', 'name').sort({ createdAt: -1 }),
  ]);

  const gradedSubmissions = submissions.filter((s) => s.status === 'graded');
  const taskCompletionPercentage =
    submissions.length > 0 ? Math.round((gradedSubmissions.length / submissions.length) * 100) : 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        student,
        enrollments,
        attendanceByBatch,
        recentSubmissions: submissions,
        taskCompletionPercentage,
        facultyReports: reports,
      },
      'Student profile fetched.'
    )
  );
});
