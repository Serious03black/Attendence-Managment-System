import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Join collection between Student and Batch (kept separate from Batch
 * rather than an embedded array so a student's batch-change history is
 * preserved via `status` instead of being overwritten in place).
 */
const enrollmentSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    enrolledOn: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['active', 'transferred', 'completed', 'dropped'],
      default: 'active',
    },
    transferredTo: { type: Schema.Types.ObjectId, ref: 'Batch' }, // set when status === 'transferred'
    enrolledBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// A student can't have two *active* enrollments in the same batch.
enrollmentSchema.index(
  { student: 1, batch: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
enrollmentSchema.index({ batch: 1, status: 1 });
enrollmentSchema.index({ student: 1, status: 1 });

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
