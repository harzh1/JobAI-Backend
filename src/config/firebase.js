import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin with credentials from environment
let firebaseApp;

try {
  // Try to initialize with service account from environment
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Fallback: Initialize with application default credentials
    // This works if running in GCP or with GOOGLE_APPLICATION_CREDENTIALS env var
    firebaseApp = initializeApp();
  }
  
  console.log("✓ Firebase Admin initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
  throw error;
}

export const db = getFirestore();
export const auth = getAuth();

export default firebaseApp;
