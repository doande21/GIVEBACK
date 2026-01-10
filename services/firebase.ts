
import { initializeApp } from "firebase/app";
// Re-importing from firebase/auth to ensure named exports are correctly recognized.
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Cấu hình dự án GIVEBACK
const firebaseConfig = {
  apiKey: "AIzaSyCps-abURYQD2mRvfoj26VJcmM0EKiPM9k",
  authDomain: "giveback-336a1.firebaseapp.com",
  projectId: "giveback-336a1",
  storageBucket: "giveback-336a1.firebasestorage.app",
  messagingSenderId: "582492929508",
  appId: "1:582492929508:web:7dc0b381a2731ea31f1bf1",
  measurementId: "G-K7QEFTLXS3"
};

// Khởi tạo ứng dụng Firebase
const app = initializeApp(firebaseConfig);

// Xuất các dịch vụ cốt lõi sau khi khởi tạo
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
