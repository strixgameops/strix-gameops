export function setupErrorHandling(app) {
  // 404 handler
  app.use((req, res, next) => {
    res.status(404).json({ 
      success: false, 
      message: "Endpoint not found" 
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error("Error caught at endpoint:", req.originalUrl, err);
    
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(statusCode).json({ 
      success: false, 
      error: message 
    });
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}