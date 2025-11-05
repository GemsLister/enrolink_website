import jwt from 'jsonwebtoken';
import { unauthorized, forbidden } from '../utils/errors.js';

export function auth(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) throw unauthorized('Missing token');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    next(unauthorized('Invalid token'));
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) return next(forbidden('Forbidden'));
    next();
  };
}
