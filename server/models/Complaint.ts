import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type ComplaintCategory =
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'INTERNET_WIFI'
  | 'FURNITURE'
  | 'CLEANING'
  | 'CLASSROOM_EQUIPMENT'
  | 'SECURITY'
  | 'TRANSPORT'
  | 'HOSTEL'
  | 'OTHER';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'VERIFIED'
  | 'CLOSED';

export interface IComplaintImage {
  url: string;
  publicId: string;
}

export interface IStatusHistoryItem {
  status: ComplaintStatus;
  changedBy: Types.ObjectId;
  timestamp: Date;
  comment?: string;
}

export interface IComplaint extends Document {
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  building: string;
  floor: string;
  room: string;
  images: IComplaintImage[];
  resolutionImages: IComplaintImage[];
  reportedBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  department?: Types.ObjectId;
  resolutionNotes?: string;
  resolvedAt?: Date;
  statusHistory: IStatusHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IStatusHistoryItem>(
  {
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED'],
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    comment: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const complaintSchema = new Schema<IComplaint>(
  {
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Complaint category is required'],
      enum: {
        values: [
          'ELECTRICAL',
          'PLUMBING',
          'INTERNET_WIFI',
          'FURNITURE',
          'CLEANING',
          'CLASSROOM_EQUIPMENT',
          'SECURITY',
          'TRANSPORT',
          'HOSTEL',
          'OTHER',
        ],
        message: '{VALUE} is not a valid complaint category',
      },
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'MEDIUM',
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED'],
        message: '{VALUE} is not a valid complaint status',
      },
      default: 'OPEN',
    },
    building: {
      type: String,
      required: [true, 'Building location is required'],
      trim: true,
      maxlength: [100, 'Building name cannot exceed 100 characters'],
    },
    floor: {
      type: String,
      required: [true, 'Floor number is required'],
      trim: true,
      maxlength: [50, 'Floor cannot exceed 50 characters'],
    },
    room: {
      type: String,
      required: [true, 'Room or lab number is required'],
      trim: true,
      maxlength: [50, 'Room cannot exceed 50 characters'],
    },
    images: {
      type: [
        new Schema<IComplaintImage>(
          {
            url: { type: String, required: true, trim: true },
            publicId: { type: String, required: true, trim: true },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
    resolutionImages: {
      type: [
        new Schema<IComplaintImage>(
          {
            url: { type: String, required: true, trim: true },
            publicId: { type: String, required: true, trim: true },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter User ID is required'],
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedAt: {
      type: Date,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    resolutionNotes: {
      type: String,
      trim: true,
      default: '',
    },
    resolvedAt: {
      type: Date,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance
complaintSchema.index({ reportedBy: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ department: 1, status: 1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ priority: 1, status: 1 });
complaintSchema.index({ category: 1 });

// Ensure id virtual
complaintSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret: Record<string, any>) => {
    ret.id = ret._id ? ret._id.toString() : undefined;
    delete ret.__v;
    if (Array.isArray(ret.images)) {
      ret.images = ret.images.map((img: any) => {
        if (typeof img === 'string') {
          return { url: img, publicId: '' };
        }
        return img;
      });
    } else {
      ret.images = [];
    }
    if (Array.isArray(ret.resolutionImages)) {
      ret.resolutionImages = ret.resolutionImages.map((img: any) => {
        if (typeof img === 'string') {
          return { url: img, publicId: '' };
        }
        return img;
      });
    } else {
      ret.resolutionImages = [];
    }
    return ret;
  },
});

export const Complaint: Model<IComplaint> =
  mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', complaintSchema);
