import dotenv from 'dotenv';
import http from 'http';
import app from './app.js';
import { connectDb } from './config/db.js';
import { ensureAdmin } from './setup/ensureAdmin.js';

// Load environment variables
// Try multiple env files for flexibility
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });
// Fallback to d41d8cd9.env if it exists (for backward compatibility)
try {
  dotenv.config({ path: 'd41d8cd9.env' });
} catch (e) {
  // Ignore if file doesn't exist
}
const port = process.env.PORT || 8080;
const server = http.createServer(app);

async function start() {
  await connectDb();
  await ensureAdmin();
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`EnroLink backend listening on :${port}`);
  });
}

start().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', e);
  process.exit(1);
});
