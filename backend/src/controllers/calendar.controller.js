import { listEvents } from '../services/google/calendar.js';

export async function list(req, res, next) {
  try {
    const { calendarId = 'primary', timeMin, timeMax } = req.query;
    const events = await listEvents(calendarId, { timeMin, timeMax });
    res.json({ events });
  } catch (e) { next(e); }
}
