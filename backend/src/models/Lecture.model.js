import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * One document per scheduled class session, materialized from a Batch's
 * recurrence pattern when the batch is created (see scheduler.service.js).
 * Everything else in the system — attendance, daily reports, the student
 * calendar — anchors to a concrete Lecture._id instead of recomputing
 * "was there a class on this date" from the recurrence rule every time.
 */
const lectureSchema = new Schema(
  {
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'holiday'],
      default: 'scheduled',
    },
    cancellationReason: { type: String, trim: true },
    // Denormalized for fast conflict lookups without populating Batch on every check
    faculty: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: String, trim: true },
  },
  { timestamps: true }
);

// A batch can't have two lecture rows on the same calendar date.
lectureSchema.index({ batch: 1, date: 1 }, { unique: true });
lectureSchema.index({ faculty: 1, date: 1 });
lectureSchema.index({ date: 1, status: 1 });

lectureSchema.virtual('dailyReport', {
  ref: 'DailyReport',
  localField: '_id',
  foreignField: 'lecture',
  justOne: true,
});

lectureSchema.set('toJSON', { virtuals: true });
lectureSchema.set('toObject', { virtuals: true });

export const Lecture = mongoose.model('Lecture', lectureSchema);
