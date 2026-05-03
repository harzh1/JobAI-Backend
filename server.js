import dotenv from "dotenv";
import express from "express";
import cors from "cors";

// Load environment variables FIRST
dotenv.config();

// Start async server initialization
(async () => {
  // Dynamic imports AFTER dotenv loads
  const { getCorsOptions } = await import("./src/middleware/cors.js");
  const { errorHandler } = await import("./src/middleware/errorHandler.js");
  const apiModule = await import("./src/routes/api.js");
  const apiRoutes = apiModule.default;

  const app = express();

  // ============================================
  // Middleware
  // ============================================

  // CORS configuration
  app.use(cors(getCorsOptions()));

  // Body parser with configurable size limits for file uploads
  const maxRequestSize = process.env.MAX_REQUEST_SIZE || '50mb';
  app.use(express.json({ limit: maxRequestSize }));
  app.use(express.urlencoded({ extended: true, limit: maxRequestSize }));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // ============================================
  // Health check
  // ============================================
  app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "Backend server is running" });
  });

  // ============================================
  // API Routes
  // ============================================
  app.use("/api", apiRoutes);

  // ============================================
  // Error handling
  // ============================================

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: "Route not found",
      path: req.path,
    });
  });

  // Global error handler
  app.use(errorHandler);

  // ============================================
  // Server startup
  // ============================================

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`✓ Backend server running on http://localhost:${PORT}`);
    console.log(`✓ API base URL: http://localhost:${PORT}/api`);
    console.log(`✓ Health check: http://localhost:${PORT}/health`);
  });
})();
