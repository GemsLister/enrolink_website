import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function loadCredentials() {
  if (process.env.GCP_CREDENTIALS) {
    try {
      const creds = JSON.parse(process.env.GCP_CREDENTIALS);
      if (!creds.client_email) throw new Error('Missing client_email in GCP credentials');
      if (!creds.private_key) throw new Error('Missing private_key in GCP credentials');
      if (typeof creds.private_key === 'string') {
        creds.private_key = creds.private_key
          .replace(/\\\\n/g, '\\n')
          .replace(/\\n/g, '\n')
          .replace(/\r\n/g, '\n')
          .replace(/\\r\\n/g, '\n');
      }
      return creds;
    } catch (error) {
      console.error('Error parsing GCP_CREDENTIALS:', error);
    }
  }

  const bqCreds = process.env.BQ_GOOGLE_APPLICATION_CREDENTIALS;
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const source = bqCreds || gac;
  if (source) {
    try {
      const val = source.trim();
      if (val.startsWith('{')) {
        const creds = JSON.parse(val);
        if (!creds.client_email) throw new Error('Missing client_email in GCP credentials');
        if (!creds.private_key) throw new Error('Missing private_key in GCP credentials');
        if (typeof creds.private_key === 'string') {
          creds.private_key = creds.private_key
            .replace(/\\\\n/g, '\\n')
            .replace(/\\n/g, '\n')
            .replace(/\r\n/g, '\n')
            .replace(/\\r\\n/g, '\n');
        }
        return creds;
      }
      const filePath = val;
      if (fs.existsSync(filePath)) {
        const json = fs.readFileSync(filePath, 'utf8');
        const creds = JSON.parse(json);
        if (typeof creds.private_key === 'string') {
          creds.private_key = creds.private_key.replace(/\\\\n/g, '\\n').replace(/\\n/g, '\n');
        }
        return creds;
      }
    } catch (error) {
      console.error('Error loading GOOGLE_APPLICATION_CREDENTIALS:', error);
    }
  }

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const candidates = [
      path.resolve(__dirname, '../../..', 'svc.json'),
      path.resolve(__dirname, '../../', 'svc.json'),
      path.resolve(process.cwd(), 'src', '..', 'svc.json'),
      path.resolve(process.cwd(), 'svc.json'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const creds = JSON.parse(raw);
        if (typeof creds.private_key === 'string') {
          creds.private_key = creds.private_key
            .replace(/\\\\n/g, '\\n')
            .replace(/\\n/g, '\n')
            .replace(/\r\n/g, '\n')
            .replace(/\\r\\n/g, '\n');
        }
        return creds;
      }
    }
  } catch (error) {
    console.error('Error loading credentials:', error);
  }

  throw new Error('GCP credentials not found for BigQuery');
}

function authClient() {
  const creds = loadCredentials();
  const scopes = ['https://www.googleapis.com/auth/bigquery'];
  const jwt = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    keyId: creds.private_key_id,
    subject: creds.client_email,
    scopes,
  });
  return jwt;
}

function mapRows(schema, rows) {
  if (!rows || !rows.length) return [];
  const fields = schema?.fields || [];
  return rows.map(r => {
    const obj = {};
    r.f.forEach((cell, idx) => {
      const name = fields[idx]?.name || String(idx);
      obj[name] = cell?.v ?? null;
    });
    return obj;
  });
}

export async function runQuery(sql, params = {}) {
  const projectId = process.env.BQ_PROJECT_ID;
  if (!projectId) throw new Error('Missing BQ_PROJECT_ID');
  const auth = authClient();
  await auth.authorize();
  const bigquery = google.bigquery({ version: 'v2', auth });

  const queryParameters = Object.entries(params).map(([name, value]) => ({
    name,
    parameterType: { type: 'STRING' },
    parameterValue: { value: value == null ? null : String(value) },
  }));

  const resp = await bigquery.jobs.query({
    projectId,
    requestBody: {
      query: sql,
      useLegacySql: false,
      parameterMode: 'NAMED',
      queryParameters,
    },
  });
  const data = resp.data;
  const rows = mapRows(data?.schema, data?.rows || []);
  return rows;
}

export async function statsFromBigQuery(year) {
  const dataset = process.env.BQ_DATASET;
  const table = process.env.BQ_TABLE_STUDENTS || 'students';
  const qualified = `\`${process.env.BQ_PROJECT_ID}.${dataset}.${table}\``;

  const filter = year
    ? `WHERE (@year IS NULL OR CAST(year AS STRING) = @year OR STARTS_WITH(CAST(batch AS STRING), @year))`
    : '';

  const totalsSql = `
    WITH filtered AS (
      SELECT status, batch, year FROM ${qualified} ${filter}
    )
    SELECT
      COUNT(1) AS totalApplicants,
      SUM(CASE WHEN status IN ('INTERVIEWED','PASSED','FAILED','ENROLLED') THEN 1 ELSE 0 END) AS interviewed,
      SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) AS passedInterview,
      SUM(CASE WHEN status = 'ENROLLED' THEN 1 ELSE 0 END) AS enrolled,
      SUM(CASE WHEN status = 'AWOL' THEN 1 ELSE 0 END) AS awol
    FROM filtered`;

  const batchesSql = `
    WITH filtered AS (
      SELECT status, batch, year FROM ${qualified} ${filter}
    )
    SELECT CAST(batch AS STRING) AS code, COUNT(1) AS count
    FROM filtered
    GROUP BY code
    ORDER BY code`;

  const [totalsRows, batchRows] = await Promise.all([
    runQuery(totalsSql, { year }),
    runQuery(batchesSql, { year }),
  ]);

  const totals = totalsRows[0] || { totalApplicants: 0, interviewed: 0, passedInterview: 0, enrolled: 0, awol: 0 };
  const batchAnalytics = batchRows.map(r => ({ code: r.code, count: Number(r.count || 0) }));

  return { totals, batchAnalytics };
}

export async function ensureStudentsTable() {
  const projectId = process.env.BQ_PROJECT_ID;
  const datasetId = process.env.BQ_DATASET;
  const tableId = process.env.BQ_TABLE_STUDENTS || 'students';
  const location = process.env.BQ_LOCATION || 'US';
  if (!projectId || !datasetId) throw new Error('Missing BigQuery dataset configuration');
  const auth = authClient();
  await auth.authorize();
  const bq = google.bigquery({ version: 'v2', auth });
  try {
    await bq.datasets.get({ projectId, datasetId });
  } catch (e) {
    try {
      await bq.datasets.insert({ projectId, requestBody: { datasetReference: { datasetId, projectId }, location } });
    } catch (insErr) {
      const msg = String(insErr && insErr.message || '');
      if (!/Already Exists/i.test(msg)) throw insErr;
    }
  }
  try {
    await bq.tables.get({ projectId, datasetId, tableId });
  } catch (e) {
    const schema = {
      fields: [
        { name: 'id', type: 'STRING' },
        { name: 'firstName', type: 'STRING' },
        { name: 'lastName', type: 'STRING' },
        { name: 'email', type: 'STRING' },
        { name: 'status', type: 'STRING' },
        { name: 'batch', type: 'STRING' },
        { name: 'year', type: 'STRING' },
        { name: 'createdAt', type: 'TIMESTAMP' },
        { name: 'updatedAt', type: 'TIMESTAMP' }
      ]
    };
    try {
      await bq.tables.insert({ projectId, datasetId, requestBody: { tableReference: { projectId, datasetId, tableId }, schema } });
    } catch (insErr) {
      const msg = String(insErr && insErr.message || '');
      if (!/Already Exists/i.test(msg)) throw insErr;
    }
  }
}

export async function insertStudentRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return { inserted: 0 };
  const projectId = process.env.BQ_PROJECT_ID;
  const datasetId = process.env.BQ_DATASET;
  const tableId = process.env.BQ_TABLE_STUDENTS || 'students';
  const qualified = `\`${projectId}.${datasetId}.${tableId}\``;
  const auth = authClient();
  await auth.authorize();
  const bq = google.bigquery({ version: 'v2', auth });

  function esc(str) {
    return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  let inserted = 0;
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values = chunk.map(r => {
      const created = r.createdAt ? `TIMESTAMP('${esc(r.createdAt)}')` : 'NULL';
      const updated = r.updatedAt ? `TIMESTAMP('${esc(r.updatedAt)}')` : 'NULL';
      return `('${esc(r.id)}','${esc(r.firstName)}','${esc(r.lastName)}','${esc(r.email)}','${esc(r.status)}','${esc(r.batch)}','${esc(r.year)}',${created},${updated})`;
    }).join(',');
    const sql = `INSERT INTO ${qualified} (id, firstName, lastName, email, status, batch, year, createdAt, updatedAt) VALUES ${values}`;
    const resp = await bq.jobs.query({ projectId, requestBody: { query: sql, useLegacySql: false } });
    const status = resp.data && resp.data.jobComplete !== false;
    if (!status) throw new Error('BigQuery insert job did not complete');
    inserted += chunk.length;
  }
  return { inserted, failed: rows.length - inserted };
}
