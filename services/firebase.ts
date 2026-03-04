
import { initializeApp } from 'firebase/app';
// Fix: Use modular imports for Firebase Auth functions and classes as per Firebase v9+ SDK
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Ưu tiên lấy Key từ biến môi trường, nếu không có mới dùng Key mặc định
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyCb2WBnZ_md_3isEGuO6kfLbo-RO5tRN-k",
  authDomain: "giveback-336a1.firebaseapp.com",
  projectId: "giveback-336a1",
  storageBucket: "giveback-336a1.firebasestorage.app",
  messagingSenderId: "582492929508",
  appId: "1:582492929508:web:7dc0b381a2731ea31f1bf1",
  measurementId: "G-K7QEFTLXS3"
};

// Khởi tạo Firebase theo chuẩn Modular
const app = initializeApp(firebaseConfig);

// Xuất các instance để sử dụng trong toàn ứng dụng
// Fix: Initialize auth using the getAuth modular function
export const auth = getAuth(app);
export const db = getFirestore(app);

// Cấu hình các Provider đăng nhập mạng xã hội
// Fix: Instantiate provider classes directly
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Thêm quyền truy cập cho Facebook
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

export default app;
