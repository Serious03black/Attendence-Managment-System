import mongoose from 'mongoose';

const { Schema } = mongoose;

const syllabusTopicSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    isCompleted: { type: Boolean, default: false }, // rolled up for "syllabus completion %"
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const courseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    durationWeeks: { type: Number, required: true, min: 1 },
    category: {
      type: String,
      enum: ['IT', 'Non-IT', 'Skill Development', 'Competitive Exam', 'Other'],
      default: 'IT',
    },
    fee: { type: Number, min: 0, default: 0 },
    syllabus: [syllabusTopicSchema],
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

courseSchema.virtual('syllabusCompletionPercent').get(function syllabusCompletionPercent() {
  if (!this.syllabus?.length) return 0;
  const done = this.syllabus.filter((t) => t.isCompleted).length;
  return Math.round((done / this.syllabus.length) * 100);
});

courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

export const Course = mongoose.model('Course', courseSchema);
