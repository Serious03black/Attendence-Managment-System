import mongoose from 'mongoose';

const { Schema } = mongoose;

const studentReportSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportPeriod: { type: String, required: true, trim: true },
    
    // Evaluation scores from 1 to 10
    communicationSkills: { type: Number, required: true, min: 1, max: 10 },
    programmingAbility: { type: Number, required: true, min: 1, max: 10 },
    attendanceDiscipline: { type: Number, required: true, min: 1, max: 10 },
    assignmentCompletion: { type: Number, required: true, min: 1, max: 10 },
    codingSkills: { type: Number, required: true, min: 1, max: 10 },
    confidence: { type: Number, required: true, min: 1, max: 10 },
    behavior: { type: Number, required: true, min: 1, max: 10 },
    technicalUnderstanding: { type: Number, required: true, min: 1, max: 10 },
    overallPerformance: { type: Number, required: true, min: 1, max: 10 },
    
    summary: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

studentReportSchema.index({ student: 1 });
studentReportSchema.index({ batch: 1 });
studentReportSchema.index({ student: 1, batch: 1 });

export const StudentReport = mongoose.model('StudentReport', studentReportSchema);
