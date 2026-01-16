
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCb2WBnZ_md_3isEGuO6kfLbo-RO5tRN-k",
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
export const auth = getAuth(app);
export const db = getFirestore(app);

// Cấu hình các Provider đăng nhập mạng xã hội
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Thêm quyền truy cập cho Facebook
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

export default app;
