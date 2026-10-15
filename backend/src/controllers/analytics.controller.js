import mongoose from 'mongoose';
import { User, Batch, Attendance, Lecture, Task, Submission, Course, Enrollment } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * ADMIN DASHBOARD: total students, total faculty, active batches,
 * attendance stats, pending approvals, recent reports, upcoming lectures —
 * every figure the brief lists for the admin dashboard, fetched in
 * parallel rather than sequentially to keep dashboard load fast.
 */
export const getAdminDashboard = asyncHandler(async (_req, res) => {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalStudents,
    totalFaculty,
    activeBatches,
    pendingApprovalsCount,
    upcomingLectures,
    attendanceAgg,
    batchesByStatus,
  ] = await Promise.all([
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: 'faculty', isActive: true }),
    Batch.countDocuments({ status: 'active' }),
    Attendance.countDocuments({ status: 'pending_approval' }),
    Lecture.find({ date: { $gte: now, $lte: weekAhead }, status: 'scheduled' })
      .populate('batch', 'name batchCode')
      .populate('faculty', 'fullName')
      .sort({ date: 1 })
      .limit(10),
    // Institute-wide approved-attendance rate over the last 30 days.
    Attendance.aggregate([
      {
        $match: {
          isApproved: true,
          reviewedAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]),
    Batch.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const attendanceRate30d =
    attendanceAgg.length > 0 && attendanceAgg[0].total > 0
      ? Math.round((attendanceAgg[0].present / attendanceAgg[0].total) * 10000) / 100
      : 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalStudents,
        totalFaculty,
        activeBatches,
        pendingApprovalsCount,
        upcomingLectures,
        attendanceRate30d,
        batchesByStatus: batchesByStatus.reduce((acc, b) => ({ ...acc, [b._id]: b.count }), {}),
      },
      'Admin dashboard data fetched.'
    )
  );
});

/**
 * Institute performance graph data: attendance trend over the last N
 * months, aggregated per calendar month. Used to power the admin's
 * "institute performance graphs" line/bar chart.
 */
export const getAttendanceTrend = asyncHandler(async (req, res) => {
  const months = Number(req.query.months) || 6;
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const trend = await Attendance.aggregate([
    { $match: { isApproved: true, reviewedAt: { $gte: start } } },
    {
      $group: {
        _id: { year: { $year: '$reviewedAt' }, month: { $month: '$reviewedAt' } },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        attendancePercentage: { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 2] },
      },
    },
  ]);

  return res.status(200).json(new ApiResponse(200, trend, 'Attendance trend fetched.'));
});

/** FACULTY DASHBOARD: my batches, pending approvals, today's lectures, recent submissions to grade. */
export const getFacultyDashboard = asyncHandler(async (req, res) => {
  const facultyId = req.user._id;
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));

  const [myBatches, pendingApprovals, todaysLectures, ungradedSubmissions] = await Promise.all([
    Batch.find({ assignedFaculty: facultyId, status: { $in: ['active', 'upcoming'] } }).populate('course', 'name'),
    Attendance.countDocuments({ batch: { $in: await Batch.find({ assignedFaculty: facultyId }).distinct('_id') }, status: 'pending_approval' }),
    Lecture.find({ faculty: facultyId, date: { $gte: todayStart, $lte: todayEnd } }).populate('batch', 'name batchCode'),
    Submission.countDocuments({
      task: { $in: await Task.find({ createdBy: facultyId }).distinct('_id') },
      status: 'submitted',
    }),
  ]);

  const totalStudents = await Enrollment.countDocuments({
    batch: { $in: myBatches.map((b) => b._id) },
    status: 'active',
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { myBatches, totalStudents, pendingApprovals, todaysLectures, ungradedSubmissions },
      'Faculty dashboard data fetched.'
    )
  );
});

/** STUDENT DASHBOARD: my batches, overall attendance, upcoming tasks, recent reports. */
export const getStudentDashboard = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const now = new Date();

  const enrollments = await Enrollment.find({ student: studentId, status: 'active' }).populate({
    path: 'batch',
    populate: [{ path: 'course', select: 'name' }, { path: 'assignedFaculty', select: 'fullName' }],
  });

  const [upcomingTasksCount, pendingAttendanceCount] = await Promise.all([
    Task.countDocuments({
      $or: [
        { batch: { $in: enrollments.map((e) => e.batch._id) }, 'assignedTo.scope': 'batch' },
        { 'assignedTo.scope': 'individual', 'assignedTo.students': studentId },
      ],
      deadline: { $gte: now },
      status: 'published',
    }),
    Attendance.countDocuments({ student: studentId, status: 'pending_approval' }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { enrollments, upcomingTasksCount, pendingAttendanceCount }, 'Student dashboard data fetched.')
  );
});

/** Batch progress: syllabus completion, lecture completion ratio, average attendance. */
export const getBatchProgress = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.batchId).populate('course');
  if (!batch) throw ApiError.notFound('Batch not found.');

  const [totalLectures, completedLectures, enrolledCount] = await Promise.all([
    Lecture.countDocuments({ batch: batch._id, status: { $in: ['scheduled', 'completed'] } }),
    Lecture.countDocuments({ batch: batch._id, status: 'completed' }),
    Enrollment.countDocuments({ batch: batch._id, status: 'active' }),
  ]);

  const avgAttendanceAgg = await Attendance.aggregate([
    { $match: { batch: new mongoose.Types.ObjectId(batch._id), isApproved: true } },
    {
      $group: {
        _id: null,
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ]);

  const avgAttendancePercentage =
    avgAttendanceAgg.length > 0 && avgAttendanceAgg[0].total > 0
      ? Math.round((avgAttendanceAgg[0].present / avgAttendanceAgg[0].total) * 10000) / 100
      : 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        batchName: batch.name,
        courseName: batch.course.name,
        syllabusCompletionPercent: batch.course.syllabusCompletionPercent,
        lectureCompletionPercent: totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0,
        totalLectures,
        completedLectures,
        enrolledCount,
        avgAttendancePercentage,
      },
      'Batch progress fetched.'
    )
  );
});

/** Faculty performance summary (admin-only view): batches taught, avg batch attendance, reports filed. */
export const getFacultyPerformance = asyncHandler(async (req, res) => {
  const facultyId = req.params.facultyId;
  const batchIds = await Batch.find({ assignedFaculty: facultyId }).distinct('_id');

  const [batchCount, studentCount, avgAttendanceAgg] = await Promise.all([
    Batch.countDocuments({ assignedFaculty: facultyId }),
    Enrollment.countDocuments({ batch: { $in: batchIds }, status: 'active' }),
    Attendance.aggregate([
      { $match: { batch: { $in: batchIds.map((id) => new mongoose.Types.ObjectId(id)) }, isApproved: true } },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]),
  ]);

  const avgAttendancePercentage =
    avgAttendanceAgg.length > 0 && avgAttendanceAgg[0].total > 0
      ? Math.round((avgAttendanceAgg[0].present / avgAttendanceAgg[0].total) * 10000) / 100
      : 0;

  return res
    .status(200)
    .json(new ApiResponse(200, { batchCount, studentCount, avgAttendancePercentage }, 'Faculty performance fetched.'));
});

export const getCourseCatalogStats = asyncHandler(async (_req, res) => {
  const stats = await Course.aggregate([
    {
      $lookup: { from: 'batches', localField: '_id', foreignField: 'course', as: 'batches' },
    },
    {
      $project: {
        name: 1,
        code: 1,
        category: 1,
        activeBatchCount: {
          $size: { $filter: { input: '$batches', as: 'b', cond: { $eq: ['$$b.status', 'active'] } } },
        },
      },
    },
  ]);
  return res.status(200).json(new ApiResponse(200, stats, 'Course catalog stats fetched.'));
});
