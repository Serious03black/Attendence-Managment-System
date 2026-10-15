import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Single place that converts *any* thrown error — ApiError, Mongoose
 * validation/cast errors, JWT errors, or an unexpected bug — into the
 * same JSON shape the frontend expects. Controllers just `throw`; they
 * never need to know how to format an error response.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error';
    const errors = [];

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      Object.values(error.errors).forEach((e) => errors.push(e.message));
    }

    // Mongoose bad ObjectId
    if (error.name === 'CastError') {
      statusCode = 400;
      message = `Invalid value for field '${error.path}'`;
    }

    // Duplicate key
    if (error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      message = `Duplicate value for '${field}'. It must be unique.`;
    }

    error = new ApiError(statusCode, message, errors, error.stack);
  }

  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${error.message}\n${error.stack}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${error.statusCode}: ${error.message}`);
  }

  return res.status(error.statusCode).json({
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
    ...(env.nodeEnv === 'development' && { stack: error.stack }),
  });
};

export const notFoundHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
