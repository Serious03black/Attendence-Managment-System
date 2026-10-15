import mongoose from 'mongoose';

const { Schema } = mongoose;

const attachmentSchema = new Schema(
  { fileName: String, url: String, publicId: String, fileType: String },
  { _id: false }
);

const submissionSchema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    content: { type: String, trim: true }, // text answer, if applicable
    attachments: [attachmentSchema],
    submittedAt: { type: Date, default: Date.now },
    isLate: { type: Boolean, default: false }, // computed at submit time vs task.deadline

    status: {
      type: String,
      enum: ['submitted', 'graded', 'returned-for-revision'],
      default: 'submitted',
    },
    marksObtained: { type: Number, min: 0 },
    feedback: { type: String, trim: true },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
  },
  { timestamps: true }
);

submissionSchema.index({ task: 1, student: 1 }, { unique: true }); // one submission per student per task
submissionSchema.index({ student: 1, status: 1 });

export const Submission = mongoose.model('Submission', submissionSchema);
