import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType =
  | 'COMPLAINT_CREATED'
  | 'COMPLAINT_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'COMMENT_ADDED'
  | 'COMPLAINT_RESOLVED'
  | 'COMPLAINT_VERIFIED'
  | 'COMPLAINT_CLOSED'
  | 'PRIORITY_CHANGED'
  | 'SYSTEM';

export interface INotification extends Document {
  recipient: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  relatedComplaint?: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: [
        'COMPLAINT_CREATED',
        'COMPLAINT_ASSIGNED',
        'STATUS_CHANGED',
        'COMMENT_ADDED',
        'COMPLAINT_RESOLVED',
        'COMPLAINT_VERIFIED',
        'COMPLAINT_CLOSED',
        'PRIORITY_CHANGED',
        'SYSTEM',
      ],
      required: true,
    },
    relatedComplaint: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      default: undefined,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Specific composite indexes specified in requirements:
// 1. recipient + isRead + createdAt
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
// 2. recipient + createdAt
notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
