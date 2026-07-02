import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required.'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters.'],
    },
    author: {
      type: String,
      required: [true, 'Author name is required.'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
    },
    category: {
      type: String,
      enum: ['ebook', 'past_question', 'journal', 'project'],
      required: [true, 'Category is required.'],
    },
    department: {
      type: String,
      required: [true, 'Department is required.'],
      trim: true,
    },
    level: {
      type: String,
      enum: ['ND1', 'ND2', 'HND1', 'HND2', 'ALL'],
      default: 'ALL',
    },
    year: {
      type: Number,
      min: [1980, 'Year cannot be before 1980.'],
      max: [new Date().getFullYear(), 'Year cannot be in the future.'],
    },
    course: {
      type: String,
      trim: true,
      uppercase: true,
    },
    tags: {
      type: [String],
      set: (tags) => tags.map((t) => t.toLowerCase().trim()),
    },
    cloudUrl: {
      type: String,
      required: [true, 'Cloud URL is required.'],
    },
    publicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required.'],
    },
    format: {
      type: String,
      default: 'pdf',
    },
    fileSize: {
      type: Number, // bytes
    },
    metadata: {
      pages: Number,
      isbn: String,
      edition: String,
      publisher: String,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Compound text index for full-text search across title, author, tags
resourceSchema.index(
  { title: 'text', author: 'text', tags: 'text' },
  { weights: { title: 10, author: 5, tags: 3 }, name: 'resource_text_search' }
);

// Compound filter index for the most common query pattern
resourceSchema.index({ department: 1, level: 1, category: 1 });
resourceSchema.index({ category: 1 });
resourceSchema.index({ uploadedBy: 1 });
resourceSchema.index({ createdAt: -1 });
resourceSchema.index({ isPublished: 1 });

const Resource = mongoose.model('Resource', resourceSchema);
export default Resource;