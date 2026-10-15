import mongoose from 'mongoose';

const { Schema } = mongoose;

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    audience: {
      type: String,
      enum: ['all', 'faculty', 'students', 'batch'],
      default: 'all',
    },
    targetBatch: { type: Schema.Types.ObjectId, ref: 'Batch' }, // set when audience === 'batch'
    isPinned: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

announcementSchema.index({ audience: 1, createdAt: -1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);
