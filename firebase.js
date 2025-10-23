// Firebase Configuration and Initialization
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// REPLACE THIS with your actual Firebase config from Step 1.5
const firebaseConfig = {
  apiKey: "AIzaSyDUoCYQvCWhoKJWP5UVCNIC6WKWpkzj71c",
  authDomain: "mf-king-inspection-app.firebaseapp.com",
  projectId: "mf-king-inspection-app",
  storageBucket: "mf-king-inspection-app.firebasestorage.app",
  messagingSenderId: "535319946963",
  appId: "1:535319946963:web:244906d88b30c0e3491626"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore Database
export const db = getFirestore(app);

// Initialize Authentication
export const auth = getAuth(app);

// Export the app instance
export default app;
