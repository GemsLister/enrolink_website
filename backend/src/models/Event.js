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

export default mongoose.model('Event', eventSchema);