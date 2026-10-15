import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Verifies the access token from the Authorization header (or httpOnly
 * cookie as a fallback for browser clients), attaches the full user doc
 * to req.user, and rejects deactivated accounts even if their token is
 * still technically valid — so an admin deactivating someone takes effect
 * immediately rather than waiting for token expiry.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const bearerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.replace('Bearer ', '')
    : null;
  const token = bearerToken || req.cookies?.accessToken;

  if (!token) {
    throw ApiError.unauthorized('Access token missing. Please log in.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwt.accessSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired. Please refresh your session.');
    }
    throw ApiError.unauthorized('Invalid access token.');
  }

  const user = await User.findById(decoded._id);
  if (!user) {
    throw ApiError.unauthorized('User associated with this token no longer exists.');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Contact your administrator.');
  }

  req.user = user;
  next();
});

/**
 * Role guard — usage: authorize('admin', 'faculty'). Must run after
 * authenticate(). Never trusts a role claim from the request body/params,
 * only req.user.role, which came from the verified JWT / fresh DB lookup.
 */
export const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required.');
  }
  if (!allowedRoles.includes(req.user.role)) {
    throw ApiError.forbidden(`Role '${req.user.role}' is not permitted to perform this action.`);
  }
  next();
};
