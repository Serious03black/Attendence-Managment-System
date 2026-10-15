import mongoose from 'mongoose';
import { Attendance, Lecture } from '../models/index.js';

/**
 * ============================================================================
 * ATTENDANCE PERCENTAGE ENGINE
 * ============================================================================
 * The brief's core requirement: "The system should automatically calculate
 * attendance percentages based only on approved attendance records" and
 * "If a lecture is cancelled or declared a holiday, it should not be
 * counted in the attendance calculation."
 *
 * This means the denominator is NOT "every Attendance doc that exists" —
 * it's "every conducted Lecture" (status scheduled/completed), and the
 * numerator is only Attendance docs with isApproved: true and a status
 * that counts as attended (present/late). Pending and rejected records
 * are excluded from both.
 * ============================================================================
 */

const ATTENDED_STATUSES = ['present', 'late'];

/**
 * Full monthly summary for one student in one batch — mirrors exactly the
 * fields the brief asks for on the student dashboard.
 */
export async function getMonthlyAttendanceSummary(studentId, batchId, year, month /* 1-12 */) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  // Denominator: lectures actually conducted (excludes cancelled/holiday).
  const conductedLectureIds = await Lecture.find({
    batch: batchId,
    date: { $gte: monthStart, $lte: monthEnd },
    status: { $in: ['scheduled', 'completed'] },
  }).distinct('_id');

  const totalLecturesConducted = conductedLectureIds.length;

  if (totalLecturesConducted === 0) {
    return {
      totalLecturesConducted: 0,
      lecturesAttended: 0,
      absentDays: 0,
      leaveDays: 0,
      pendingRequests: 0,
      rejectedRequests: 0,
      attendancePercentage: 0,
      belowThreshold: false,
    };
  }

  // Single aggregation over this student's attendance for those lectures,
  // grouped by status, rather than N separate count queries.
  const grouped = await Attendance.aggregate([
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        lecture: { $in: conductedLectureIds },
      },
    },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const counts = grouped.reduce((acc, g) => ({ ...acc, [g._id]: g.count }), {});

  // Only approved present/late count as "attended". An approved 'absent'
  // or 'leave' record is a resolved record (not pending) but does not
  // count toward attendance.
  const lecturesAttended = (counts.present || 0) + (counts.late || 0);
  const absentDays = counts.absent || 0;
  const leaveDays = counts.leave || 0;
  const pendingRequests = counts.pending_approval || 0;
  const rejectedRequests = counts.rejected || 0;

  const attendancePercentage = Math.round((lecturesAttended / totalLecturesConducted) * 10000) / 100;

  return {
    totalLecturesConducted,
    lecturesAttended,
    absentDays,
    leaveDays,
    pendingRequests,
    rejectedRequests,
    attendancePercentage,
    belowThreshold: attendancePercentage < 75,
  };
}

/**
 * Calendar-view data for a student across a date range: one entry per
 * conducted lecture the student is enrolled for for, with the color-coding
 * status the frontend calendar needs directly (present/absent/pending/leave/
 * holiday), so the frontend doesn't have to re-derive color from raw status.
 */
export async function getAttendanceCalendar(studentId, batchId, startDate, endDate) {
  const lectures = await Lecture.find({
    batch: batchId,
    date: { $gte: startDate, $lte: endDate },
  })
    .select('date startTime endTime status faculty')
    .populate('faculty', 'fullName')
    .sort({ date: 1 })
    .lean();

  const lectureIds = lectures.map((l) => l._id);
  const records = await Attendance.find({ student: studentId, lecture: { $in: lectureIds } }).lean();
  const byLecture = new Map(records.map((r) => [String(r.lecture), r]));

  return lectures.map((lecture) => {
    if (lecture.status === 'holiday' || lecture.status === 'cancelled') {
      return {
        date: lecture.date,
        calendarStatus: 'holiday', // renders Gray
        lecture,
        attendance: null,
      };
    }

    const record = byLecture.get(String(lecture._id));
    if (!record) {
      // Lecture happened but student never submitted — surfaced distinctly
      // so faculty/admin can spot no-shows that were never even self-marked.
      return { date: lecture.date, calendarStatus: 'no-lecture', lecture, attendance: null };
    }

    const calendarStatusMap = {
      present: 'present', // Green
      late: 'present', // Green (still counts as attended)
      absent: 'absent', // Red
      leave: 'leave', // Blue
      pending_approval: 'pending', // Yellow
      rejected: 'absent', // Red — rejected self-marks are functionally absences
    };

    return {
      date: lecture.date,
      calendarStatus: calendarStatusMap[record.status] || 'no-lecture',
      lecture,
      attendance: record,
    };
  });
}

export { ATTENDED_STATUSES };
