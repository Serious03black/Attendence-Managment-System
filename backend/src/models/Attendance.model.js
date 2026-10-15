import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Implements the student-initiated / faculty-approved attendance workflow.
 *
 * Lifecycle:
 *   student submits -> status: 'pending_approval', isApproved: false
 *   faculty approves -> status: 'present' | 'late' (whatever the student
 *                        claimed, faculty can also override the status on
 *                        approval), isApproved: true, reviewedBy/reviewedAt set
 *   faculty rejects  -> status: 'rejected', isApproved: false, remark required
 *
 * `isApproved` is the single source of truth the attendance-percentage
 * aggregation filters on (see attendance.service.js) — kept as an explicit
 * boolean rather than inferring "approved" from `status !== 'pending'`
 * so the aggregation pipeline is a simple, index-friendly `{ isApproved: true }`
 * match instead of an `$in` over multiple status strings.
 */
const attendanceSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lecture: { type: Schema.Types.ObjectId, ref: 'Lecture', required: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true }, // denormalized for fast per-batch queries

    status: {
      type: String,
      enum: ['pending_approval', 'present', 'absent', 'leave', 'late', 'rejected'],
      default: 'pending_approval',
      required: true,
    },
    // What the student originally claimed at submission time (present/
    // absent/leave/late). Preserved even after faculty review so the
    // approval UI can show "student claimed X" alongside the faculty's
    // final decision — distinct from `status`, which is the authoritative
    // value used everywhere else (percentage calc, calendar color-coding).
    claimedStatus: { type: String, enum: ['present', 'absent', 'leave', 'late'], required: true },
    isApproved: { type: Boolean, default: false },

    submittedAt: { type: Date, default: Date.now },
    submittedLocation: {
      // optional geo-tag for classroom-mode self-marking, to discourage remote false-marking
      lat: Number,
      lng: Number,
    },

    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    facultyRemark: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// One attendance record per student per lecture — prevents duplicate submission.
attendanceSchema.index({ student: 1, lecture: 1 }, { unique: true });
attendanceSchema.index({ batch: 1, status: 1 }); // faculty's pending-approval queue
attendanceSchema.index({ student: 1, isApproved: 1 }); // percentage calculation
attendanceSchema.index({ reviewedBy: 1, reviewedAt: -1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
