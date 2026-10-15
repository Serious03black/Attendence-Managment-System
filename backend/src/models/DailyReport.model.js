import mongoose from 'mongoose';

const { Schema } = mongoose;

const attachmentSchema = new Schema(
  {
    fileName: String,
    url: String,
    publicId: String,
    fileType: String,
  },
  { _id: false }
);

/**
 * One report per Lecture, written by the assigned faculty. Queried by
 * `batch` (for the batch's learning timeline) and, via the batch's
 * enrolled students, surfaced on each student's dashboard — the report
 * itself is never duplicated per-student.
 */
const dailyReportSchema = new Schema(
  {
    lecture: { type: Schema.Types.ObjectId, ref: 'Lecture', required: true, unique: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    faculty: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },

    topicCovered: { type: String, required: true, trim: true },
    subtopics: [{ type: String, trim: true }],
    teachingHours: { type: Number, min: 0, max: 24, required: true },

    studentParticipation: {
      type: String,
      enum: ['excellent', 'good', 'average', 'poor'],
      default: 'good',
    },

    assignmentsGiven: [{ type: String, trim: true }],
    homework: { type: String, trim: true },
    references: [{ type: String, trim: true }],
    notes: { type: String, trim: true },
    attachments: [attachmentSchema],

    upcomingTopics: [{ type: String, trim: true }],
    remarks: { type: String, trim: true },
    overallBatchPerformance: {
      type: String,
      enum: ['excellent', 'good', 'average', 'needs-improvement'],
      default: 'good',
    },
  },
  { timestamps: true }
);

dailyReportSchema.index({ batch: 1, date: -1 });
dailyReportSchema.index({ faculty: 1, date: -1 });

export const DailyReport = mongoose.model('DailyReport', dailyReportSchema);
