import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import pino from 'pino';
import pinoHttp from 'pino-http';
import routes from './routes/index.js';
import eventRoutes from './routes/events.routes.js';
import calendarRoutes from './routes/calendar.routes.js';

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Middleware
app.use(pinoHttp({ logger }));
app.use(morgan('tiny'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Content-Range', 'X-Total-Count']
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Routes - only register each route once
app.use('/api', routes);           // Main API routes
app.use('/api/events', eventRoutes); // Event-specific routes
app.use('/api/calendar', calendarRoutes); // Calendar routes

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

export default app;