import { Batch, Lecture, Enrollment } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { WEEKDAYS } from '../models/Batch.model.js';

/**
 * ============================================================================
 * SCHEDULING ENGINE
 * ============================================================================
 * This module owns every piece of logic around turning a recurrence rule
 * (weekdays + time range + date range) into concrete Lecture documents, and
 * detecting scheduling conflicts before a batch is ever persisted. It is
 * kept out of the controller so it can be unit-tested in isolation and
 * reused by both "create batch" and "reschedule batch" flows.
 * ============================================================================
 */

/** "14:30" -> 870 (minutes since midnight). Avoids string-comparison bugs
 * around things like "9:05" vs "10:00" and makes overlap math trivial. */
export function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Two [startA,endA) / [startB,endB) minute ranges overlap iff
 * startA < endB && startB < endA. Half-open so a 10-12 slot and a
 * 12-14 slot back-to-back do NOT count as a conflict. */
function timeRangesOverlap(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}

function weekdaysIntersect(daysA, daysB) {
  return daysA.some((d) => daysB.includes(d));
}

/** Do two batches' active date ranges overlap at all? If not, weekday/time
 * overlap is irrelevant — e.g. a Jan–Mar batch and an Apr–Jun batch can
 * share every weekday and timeslot with zero real conflict. */
function dateRangesOverlap(startA, endA, startB, endB) {
  return new Date(startA) <= new Date(endB) && new Date(startB) <= new Date(endA);
}

/**
 * Checks a proposed batch (not yet saved) against all existing non-cancelled
 * batches for the same faculty and, separately, the same classroom. Returns
 * an array of human-readable conflict descriptions — empty array means clear.
 *
 * @param {object} proposed - { assignedFaculty, roomId, mode, weekdays, startTime, endTime, batchStartDate, batchEndDate, _id? }
 *   _id is passed when re-validating an *edit* to an existing batch, so that
 *   batch can be excluded from comparing against itself.
 */
export async function detectBatchConflicts(proposed) {
  const conflicts = [];

  const dateFilter = { status: { $ne: 'cancelled' } };
  if (proposed._id) dateFilter._id = { $ne: proposed._id };

  // --- 1. Faculty conflict: same trainer, overlapping weekday + time + date range ---
  const facultyBatches = await Batch.find({
    ...dateFilter,
    assignedFaculty: proposed.assignedFaculty,
  }).select('name batchCode weekdays startTime endTime batchStartDate batchEndDate');

  for (const existing of facultyBatches) {
    if (
      dateRangesOverlap(proposed.batchStartDate, proposed.batchEndDate, existing.batchStartDate, existing.batchEndDate) &&
      weekdaysIntersect(proposed.weekdays, existing.weekdays) &&
      timeRangesOverlap(proposed.startTime, proposed.endTime, existing.startTime, existing.endTime)
    ) {
      conflicts.push(
        `Faculty is already assigned to batch "${existing.name}" (${existing.batchCode}) with an overlapping schedule.`
      );
    }
  }

  // --- 2. Classroom conflict: same room, overlapping weekday + time + date range ---
  // Skipped entirely for online batches, which have no physical room.
  if (proposed.mode !== 'online' && proposed.roomId) {
    const roomBatches = await Batch.find({
      ...dateFilter,
      roomId: proposed.roomId,
      mode: { $ne: 'online' },
    }).select('name batchCode weekdays startTime endTime batchStartDate batchEndDate');

    for (const existing of roomBatches) {
      if (
        dateRangesOverlap(proposed.batchStartDate, proposed.batchEndDate, existing.batchStartDate, existing.batchEndDate) &&
        weekdaysIntersect(proposed.weekdays, existing.weekdays) &&
        timeRangesOverlap(proposed.startTime, proposed.endTime, existing.startTime, existing.endTime)
      ) {
        conflicts.push(
          `Room "${proposed.roomId}" is already booked for batch "${existing.name}" (${existing.batchCode}) with an overlapping schedule.`
        );
      }
    }
  }

  return conflicts;
}

/**
 * Student-side conflict check, run at enrollment time (not batch-creation
 * time, since a batch has no students yet when it's created). Compares the
 * target batch's schedule against every batch the student is already
 * actively enrolled in.
 */
export async function detectStudentConflicts(studentId, targetBatch) {
  const activeEnrollments = await Enrollment.find({ student: studentId, status: 'active' }).populate({
    path: 'batch',
    select: 'name batchCode weekdays startTime endTime batchStartDate batchEndDate status',
  });

  const conflicts = [];
  for (const enrollment of activeEnrollments) {
    const existing = enrollment.batch;
    if (!existing || existing.status === 'cancelled') continue;
    if (String(existing._id) === String(targetBatch._id)) continue;

    if (
      dateRangesOverlap(targetBatch.batchStartDate, targetBatch.batchEndDate, existing.batchStartDate, existing.batchEndDate) &&
      weekdaysIntersect(targetBatch.weekdays, existing.weekdays) &&
      timeRangesOverlap(targetBatch.startTime, targetBatch.endTime, existing.startTime, existing.endTime)
    ) {
      conflicts.push(
        `Student is already enrolled in "${existing.name}" (${existing.batchCode}) with an overlapping schedule.`
      );
    }
  }
  return conflicts;
}

/**
 * Given a recurrence pattern, returns the resolved weekday list. For
 * 'custom', 'weekend', and 'saturday-fullday' the caller-provided weekdays
 * are trusted as-is (validated by the schema's enum); for 'daily' and
 * 'alternate' we still require the caller to pass explicit weekdays rather
 * than assuming a hardcoded Mon-Wed-Fri, since 'alternate' is ambiguous
 * (Mon/Wed/Fri OR Tue/Thu/Sat) without it.
 */
export function resolveWeekdays(recurrencePattern, weekdays) {
  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    throw ApiError.badRequest(`weekdays[] must be provided explicitly for pattern "${recurrencePattern}".`);
  }
  const invalid = weekdays.filter((d) => !WEEKDAYS.includes(d));
  if (invalid.length > 0) {
    throw ApiError.badRequest(`Invalid weekday(s): ${invalid.join(', ')}`);
  }
  if (recurrencePattern === 'weekend' && !weekdays.every((d) => ['saturday', 'sunday'].includes(d))) {
    throw ApiError.badRequest('Pattern "weekend" only accepts saturday/sunday.');
  }
  if (recurrencePattern === 'saturday-fullday' && !(weekdays.length === 1 && weekdays[0] === 'saturday')) {
    throw ApiError.badRequest('Pattern "saturday-fullday" must specify only saturday.');
  }
  return weekdays;
}

/**
 * Materializes one Lecture document per calendar date between
 * batchStartDate and batchEndDate (inclusive) that falls on one of the
 * batch's scheduled weekdays. Called once, right after a Batch is created.
 * Uses insertMany for a single round-trip rather than N sequential saves.
 */
export async function generateLectureOccurrences(batch) {
  const occurrences = [];
  const cursor = new Date(batch.batchStartDate);
  const end = new Date(batch.batchEndDate);

  while (cursor <= end) {
    const dayName = WEEKDAYS[cursor.getDay()];
    if (batch.weekdays.includes(dayName)) {
      occurrences.push({
        batch: batch._id,
        date: new Date(cursor),
        startTime: batch.startTime,
        endTime: batch.endTime,
        faculty: batch.assignedFaculty,
        roomId: batch.roomId,
        status: 'scheduled',
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (occurrences.length === 0) {
    throw ApiError.badRequest(
      'The selected date range and weekdays produce zero lecture occurrences. Check batchStartDate/batchEndDate against weekdays.'
    );
  }

  return Lecture.insertMany(occurrences, { ordered: true });
}

/**
 * Counts how many *non-cancelled, non-holiday* lectures fall within a
 * given month for a batch — used both as the denominator for attendance
 * percentage and as the "Total Lectures Conducted" figure faculty can
 * review, per the brief's requirement that this be auto-calculated from
 * the schedule rather than manually entered.
 */
export async function countConductedLecturesInMonth(batchId, year, month /* 1-12 */) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  return Lecture.countDocuments({
    batch: batchId,
    date: { $gte: monthStart, $lte: monthEnd },
    status: { $in: ['scheduled', 'completed'] }, // excludes 'cancelled' and 'holiday'
  });
}
