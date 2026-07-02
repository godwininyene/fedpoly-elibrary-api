import mongoose from 'mongoose';

/**
 * Tracks unique user interactions per resource.
 * One document per user+resource+action combination.
 * Using a compound unique index ensures a user can only be counted
 * once per resource per action type, regardless of how many times
 * they view or download.
 */
const interactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
    },
    action: {
      type: String,
      enum: ['view', 'download'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// This is the core of the uniqueness guarantee.
// MongoDB will reject any duplicate user+resource+action combination,
// which we catch and handle silently — meaning no double-counting ever.
interactionSchema.index(
  { user: 1, resource: 1, action: 1 },
  { unique: true }
);

const Interaction = mongoose.model('Interaction', interactionSchema);
export default Interaction;