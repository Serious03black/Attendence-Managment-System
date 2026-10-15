import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'attendance_approved',
        'attendance_rejected',
        'report_uploaded',
        'task_assigned',
        'task_deadline_reminder',
        'task_graded',
        'remark_added',
        'announcement',
        'batch_assigned',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true }, // frontend route to deep-link to, e.g. /student/tasks/:id
    relatedEntity: {
      entityType: { type: String, trim: true }, // 'Task' | 'Attendance' | 'DailyReport' | ...
      entityId: { type: Schema.Types.ObjectId },
    },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
