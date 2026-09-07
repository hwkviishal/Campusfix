import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment extends Document {
  complaint: Types.ObjectId;
  author: Types.ObjectId;
  message: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    complaint: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required'],
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment author is required'],
    },
    message: {
      type: String,
      required: [true, 'Comment message is required'],
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Performance index specified in requirements: complaint + createdAt
commentSchema.index({ complaint: 1, createdAt: 1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
