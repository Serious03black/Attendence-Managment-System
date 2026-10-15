import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

/**
 * Run after an array of express-validator chains. Collects all field
 * errors into one ApiError.badRequest response instead of failing on
 * the first invalid field, so the frontend form can highlight every
 * problem at once.
 */
export const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  throw ApiError.badRequest('Validation failed', errors);
};
