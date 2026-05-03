/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error("Unhandled error:", err);

  // Default error response
  const response = {
    success: false,
    error: err.message || "Internal server error",
    code: err.code || "internal_error",
  };

  // Set status code
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json(response);
};

/**
 * Wrapper to catch async route errors
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
