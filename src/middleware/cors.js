/**
 * CORS configuration for development and production
 */
const normalizeOrigin = (origin = "") => {
  try {
    return new URL(origin).origin;
  } catch (e) {
    return origin.trim().replace(/\/+$/, "");
  }
};

const getConfiguredOrigins = () => {
  const configuredOrigins = [
    "http://localhost:5173", // Vite dev server
    "http://localhost:3000", // Alternative dev port
    "http://localhost:5000", // Backend local
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : []),
  ];

  return [...new Set(configuredOrigins.map(normalizeOrigin).filter(Boolean))];
};

export const getCorsOptions = () => {
  const allowedOrigins = getConfiguredOrigins();

  return {
    origin: (origin, callback) => {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!origin || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        console.warn(
          `CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(", ")}`
        );
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  };
};
