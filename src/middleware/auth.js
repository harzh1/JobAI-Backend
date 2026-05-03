import { verifyFirebaseToken } from "../utils/helpers.js";

/**
 * Middleware to verify Firebase authentication token
 * Extracts token from Authorization header (Bearer token)
 * Adds auth info to request object
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Missing or invalid authorization header",
      });
    }

    const idToken = authHeader.slice("Bearer ".length);
    
    try {
      const decoded = await verifyFirebaseToken(idToken);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        token: decoded,
      };
      next();
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid token",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal server error during authentication",
    });
  }
};

/**
 * Optional auth middleware - doesn't fail if token is missing
 * But sets req.user if token is valid
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.slice("Bearer ".length);
      try {
        const decoded = await verifyFirebaseToken(idToken);
        req.user = {
          uid: decoded.uid,
          email: decoded.email,
          token: decoded,
        };
      } catch (tokenError) {
        console.log("Optional auth token verification failed, continuing without auth");
      }
    }
    next();
  } catch (error) {
    next();
  }
};
