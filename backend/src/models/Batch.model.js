import mongoose from 'mongoose';

const { Schema } = mongoose;

export const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Convenience presets the frontend can offer as one-click buttons; they just
// pre-fill startTime/endTime — the schema itself only ever stores concrete times.
export const PREDEFINED_SLOTS = {
  SLOT_1: { label: '10:00 AM – 12:00 PM', startTime: '10:00', endTime: '12:00' },
  SLOT_2: { label: '12:00 PM – 2:00 PM', startTime: '12:00', endTime: '14:00' },
  SLOT_3: { label: '3:00 PM – 5:00 PM', startTime: '15:00', endTime: '17:00' },
  SLOT_4: { label: '5:00 PM – 7:00 PM', startTime: '17:00', endTime: '19:00' },
};

export const RECURRENCE_PATTERNS = ['daily', 'alternate', 'weekend', 'saturday-fullday', 'custom'];

const batchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    batchCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    assignedFaculty: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    mode: { type: String, enum: ['classroom', 'online', 'hybrid'], default: 'classroom' },
    roomId: { type: String, trim: true }, // required only when mode === 'classroom'/'hybrid'; enforced in validator below
    onlineMeetingLink: { type: String, trim: true },

    // --- Scheduling core ---
    recurrencePattern: { type: String, enum: RECURRENCE_PATTERNS, required: true },
    weekdays: {
      // Explicit list of scheduled weekdays. For 'alternate' this is e.g.
      // ['monday','wednesday','friday'] OR ['tuesday','thursday','saturday'] —
      // never hardcoded, always what the admin/faculty actually picks.
      type: [{ type: String, enum: WEEKDAYS }],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one weekday must be selected',
      },
    },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ }, // 24h "HH:mm"
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },

    batchStartDate: { type: Date, required: true },
    batchEndDate: { type: Date, required: true },

    maxCapacity: { type: Number, required: true, min: 1, default: 30 },

    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed', 'cancelled'],
      default: 'upcoming',
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

batchSchema.index({ assignedFaculty: 1, status: 1 });
batchSchema.index({ course: 1 });
batchSchema.index({ weekdays: 1 });

// Cross-field validation: end date after start date, end time after start time,
// classroom mode requires a room. Kept here (not just in the controller) so
// this invariant holds even if a script or future admin tool writes directly
// via the model.
batchSchema.pre('validate', function crossFieldChecks(next) {
  if (this.batchStartDate && this.batchEndDate && this.batchEndDate <= this.batchStartDate) {
    return next(new Error('batchEndDate must be after batchStartDate'));
  }
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    return next(new Error('endTime must be after startTime'));
  }
  if (['classroom', 'hybrid'].includes(this.mode) && !this.roomId) {
    return next(new Error('roomId is required for classroom/hybrid batches'));
  }
  next();
});

batchSchema.virtual('enrollments', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'batch',
});

batchSchema.set('toJSON', { virtuals: true });
batchSchema.set('toObject', { virtuals: true });

export const Batch = mongoose.model('Batch', batchSchema);
