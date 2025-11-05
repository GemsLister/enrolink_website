import { google } from 'googleapis';

function authClient() {
  const creds = JSON.parse(process.env.GCP_CREDENTIALS || '{}');
  const jwt = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ['https://www.googleapis.com/auth/calendar.readonly']
  );
  return jwt;
}

export async function listEvents(calendarId, { timeMin, timeMax } = {}) {
  const auth = await authClient();
  const calendar = google.calendar({ version: 'v3', auth });
  const params = { calendarId, singleEvents: true, orderBy: 'startTime' };
  if (timeMin) params.timeMin = timeMin;
  if (timeMax) params.timeMax = timeMax;
  const resp = await calendar.events.list(params);
  return resp.data.items || [];
}
