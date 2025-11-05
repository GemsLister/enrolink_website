import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import pino from 'pino';
import pinoHttp from 'pino-http';
import routes from './routes/index.js';

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

app.use(pinoHttp({ logger }));
app.use(morgan('tiny'));
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', routes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

export default app;
