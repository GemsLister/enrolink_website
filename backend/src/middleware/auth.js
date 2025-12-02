// In backend/src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { unauthorized, forbidden } from '../utils/errors.js';
import { getOfficerUserModel } from '../models/User.js';

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    console.log('Auth header:', authHeader ? 'Exists' : 'Missing');
    
    if (!authHeader) {
      return next(unauthorized('No token, authorization denied'));
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token received:', token ? 'Exists' : 'Missing');
    
    if (!token) {
      return next(unauthorized('No token, authorization denied'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', { 
        id: decoded.id, 
        role: decoded.role,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', {
        name: jwtError.name,
        message: jwtError.message,
        expiredAt: jwtError.expiredAt
      });
      throw jwtError;
    }
  } catch (e) {
    console.error('Auth middleware error:', e);
    next(unauthorized(e.message));
  }
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      console.log(`Role check failed: required ${role}, user role: ${req.user?.role}`);
      return next(forbidden('Forbidden'));
    }
    next();
  };
};

export const requireAnyRole = (...roles) => {
  const allow = roles.flat();
  return (req, res, next) => {
    const hasRole = req.user && allow.includes(req.user.role);
    if (!hasRole) {
      console.log(`Role check failed: required one of ${allow.join(', ')}, user role: ${req.user?.role}`);
      return next(forbidden('Forbidden'));
    }
    next();
  };
};

export const requireOfficerPermission = (perm) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return next(unauthorized('Invalid token'))
      if (req.user.role !== 'OFFICER') return next()
      const User = getOfficerUserModel();
      const u = await User.findById(req.user.id).lean();
      const ok = !!(u && u.permissions && u.permissions[perm]);
      if (!ok) {
        console.log(`Permission denied: officer ${req.user.id} lacks ${perm}`);
        return next(forbidden('Forbidden'));
      }
      next();
    } catch (e) {
      next(unauthorized('Invalid token'))
    }
  }
}
