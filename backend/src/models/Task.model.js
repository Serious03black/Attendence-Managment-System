import mongoose from 'mongoose';

const { Schema } = mongoose;

const attachmentSchema = new Schema(
  { fileName: String, url: String, publicId: String, fileType: String },
  { _id: false }
);

/**
 * A task can target an entire batch (`assignedTo.scope = 'batch'`, every
 * enrolled student sees it) or specific students (`scope = 'individual'`,
 * only `assignedTo.students` see it). Kept as one model with a discriminant
 * scope field rather than two separate collections, since submission,
 * grading, and querying logic is identical either way.
 */
const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['coding', 'homework', 'quiz', 'practice', 'mini-project', 'presentation', 'research', 'reading'],
      required: true,
    },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // faculty

    assignedTo: {
      scope: { type: String, enum: ['batch', 'individual'], required: true, default: 'batch' },
      students: [{ type: Schema.Types.ObjectId, ref: 'User' }], // populated only when scope === 'individual'
    },

    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    deadline: { type: Date, required: true },
    maxMarks: { type: Number, min: 0, default: 100 },

    referenceLinks: [{ type: String, trim: true }],
    attachments: [attachmentSchema],
    submissionRequirements: { type: String, trim: true },

    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'published' },
  },
  { timestamps: true }
);

taskSchema.index({ batch: 1, status: 1 });
taskSchema.index({ 'assignedTo.students': 1 });
taskSchema.index({ deadline: 1 });

taskSchema.virtual('submissions', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'task',
});

taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

export const Task = mongoose.model('Task', taskSchema);
