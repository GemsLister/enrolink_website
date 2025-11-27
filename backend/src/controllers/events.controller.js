import Event from '../models/Event.js';
import { deleteEvent as gcalDelete, getAutoCalendarId } from '../services/google/calendar.js';

// Get events within date range
export const getEvents = async (req, res) => {
  try {
    const { start, end } = req.query;
    const events = await Event.find({
      user: req.user.id,
      start: { $gte: new Date(start) },
      end: { $lte: new Date(end) }
    }).sort({ start: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create new event
export const createEvent = async (req, res) => {
  try {
    const event = new Event({
      ...req.body,
      user: req.user.id
    });
    const newEvent = await event.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true }
    );
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Event.deleteOne({ _id: event._id });

    if (event.googleEventId) {
      try {
        const calendarId = await getAutoCalendarId();
        await gcalDelete(calendarId, event.googleEventId);
      } catch (gcalError) {
        console.error('Failed to delete Google Calendar event:', {
          message: gcalError.message,
          code: gcalError.code,
          response: gcalError.response?.data
        });
      }
    }

    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};