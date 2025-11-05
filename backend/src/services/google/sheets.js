import { google } from 'googleapis';

function authClient() {
  const creds = JSON.parse(process.env.GCP_CREDENTIALS || '{}');
  const jwt = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );
  return jwt;
}

export async function readSheet(spreadsheetId, range) {
  const auth = await authClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return resp.data.values || [];
}
