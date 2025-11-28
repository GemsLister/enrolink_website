import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  allDay: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#8a1d35'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  googleEventId: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// Add index for better query performance
eventSchema.index({ user: 1, start: 1, end: 1 });
// Add unique compound index to prevent duplicate events for the same user with same googleEventId
eventSchema.index({ user: 1, googleEventId: 1 }, { unique: true, sparse: true });

export default mongoose.model('Event', eventSchema);