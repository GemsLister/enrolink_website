import { google } from 'googleapis';

function authClient(scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']) {
  const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS || '{}');
  const jwt = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    scopes
  );
  return jwt;
}

export async function readSheet(spreadsheetId, range) {
  const auth = await authClient(['https://www.googleapis.com/auth/spreadsheets.readonly']);
  const sheets = google.sheets({ version: 'v4', auth });
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return resp.data.values || [];
}

function parseSheetUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    // Expect /spreadsheets/d/{id}/
    const parts = u.pathname.split('/').filter(Boolean);
    const dIdx = parts.findIndex(p => p === 'd');
    const spreadsheetId = dIdx >= 0 && parts[dIdx + 1] ? parts[dIdx + 1] : '';
    let gid = '';
    let range = '';
    // Hash may contain gid and range e.g. #gid=0&range=A1:B10
    if (u.hash && u.hash.startsWith('#')) {
      const h = new URLSearchParams(u.hash.slice(1));
      gid = h.get('gid') || '';
      range = h.get('range') || '';
    }
    return { spreadsheetId, gid, range };
  } catch (_) {
    return { spreadsheetId: '', gid: '', range: '' };
  }
}

async function resolveSheetTitleByGid(sheetsApi, spreadsheetId, gidStr) {
  if (!gidStr) return '';
  const gid = Number(gidStr);
  if (!Number.isFinite(gid)) return '';
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId });
  const tabs = meta?.data?.sheets || [];
  const match = tabs.find(s => s?.properties?.sheetId === gid);
  return match?.properties?.title || '';
}

export async function readSheetByUrl(urlStr) {
  const { spreadsheetId, gid, range } = parseSheetUrl(urlStr);
  if (!spreadsheetId) throw new Error('Invalid Google Sheets URL');
  const auth = await authClient(['https://www.googleapis.com/auth/spreadsheets.readonly']);
  const sheets = google.sheets({ version: 'v4', auth });
  let sheetTitle = '';
  try {
    sheetTitle = await resolveSheetTitleByGid(sheets, spreadsheetId, gid);
  } catch (_) {}
  const effectiveRange = range || `${sheetTitle || 'Sheet1'}!A:Z`;
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range: effectiveRange });
  return resp.data.values || [];
}

export async function writeSheet(spreadsheetId, range, values) {
  const auth = await authClient(['https://www.googleapis.com/auth/spreadsheets']);
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values }
  });
}
