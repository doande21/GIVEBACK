
import { initializeApp } from "firebase/app";
import { getAuth, FacebookAuthProvider, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCps-abURYQD2mRvfoj26VJcmM0EKiPM9k",
  authDomain: "giveback-336a1.firebaseapp.com",
  projectId: "giveback-336a1",
  storageBucket: "giveback-336a1.firebasestorage.app",
  messagingSenderId: "582492929508",
  appId: "1:582492929508:web:7dc0b381a2731ea31f1bf1",
  measurementId: "G-K7QEFTLXS3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Export trực tiếp để tránh lỗi "does not provide an export named"
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

export default app;
