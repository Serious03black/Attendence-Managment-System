/**
 * Wraps an async controller so thrown errors (or rejected promises)
 * are forwarded to next() and handled by the centralized error middleware,
 * instead of every controller needing its own try/catch.
 */
export const asyncHandler = (requestHandler) => (req, res, next) => {
  Promise.resolve(requestHandler(req, res, next)).catch(next);
};
