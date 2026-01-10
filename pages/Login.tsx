
import React, { useState } from 'react';
import { User } from '../types';
// Fix: Ensure standard modular imports for Firebase Auth functions.
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from '../services/firebase';

interface LoginProps {
  onLogin: (role: 'user' | 'admin', userData?: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (password.length < 6) {
          throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
        }

        // Modular SDK functions take auth as first parameter
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        await updateProfile(firebaseUser, { displayName: fullName });

        const newUser: User = {
          id: firebaseUser.uid,
          name: fullName,
          email: email,
          role: 'user',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=059669&color=fff`
        };

        await setDoc(doc(db, "users", firebaseUser.uid), newUser);
        onLogin('user', newUser);
      } else {
        // Tài khoản Admin thủ công cho bạn trải nghiệm
        if ((email === 'de2104' || email === 'admin@giveback.vn') && password === '21042005de') {
             onLogin('admin', {
               id: 'admin-manual',
               name: 'Đệ (Admin)',
               email: email,
               role: 'admin',
               avatar: 'https://ui-avatars.com/api/?name=Admin&background=059669&color=fff'
             });
             return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        onLogin('user', {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Thành viên',
          email: firebaseUser.email || '',
          role: (email === 'de2104' || email === 'admin@giveback.vn') ? 'admin' : 'user',
          avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.email || 'User')}&background=random`
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('Mật khẩu')) {
        setError(err.message);
      } else if (err.code === 'auth/invalid-credential') {
        setError('Email hoặc mật khẩu không chính xác.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email này đã được sử dụng bởi một tài khoản khác.');
      } else {
        setError('Đã xảy ra lỗi: ' + (err.code || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f0f9f6]">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-block bg-emerald-600 p-5 rounded-[2rem] shadow-2xl shadow-emerald-200/50 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <h1 className="text-5xl font-black text-emerald-900 italic tracking-tighter uppercase mb-2">GIVEBACK</h1>
          <p className="text-emerald-700/60 font-semibold text-lg italic underline decoration-emerald-300">Tặng đồ - Nhận yêu thương</p>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(5,150,105,0.1)] border border-emerald-50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
          
          <div className="flex mb-10 bg-gray-100/80 p-1.5 rounded-2xl">
            <button 
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${!isRegister ? 'bg-white text-emerald-600 shadow-lg' : 'text-gray-400'}`}
            >
              Đăng nhập
            </button>
            <button 
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${isRegister ? 'bg-white text-emerald-600 shadow-lg' : 'text-gray-400'}`}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegister && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Họ tên của bạn</label>
                <input required type="text" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-gray-700 transition-all" placeholder="Nguyễn Văn Đệ" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Email liên lạc</label>
              <input required type="text" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-gray-700 transition-all" placeholder="vidu@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Mật khẩu bí mật</label>
              <div className="relative">
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  title="Mật khẩu" 
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-gray-700 transition-all" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.024 10.024 0 014.13-5.541M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 21l-2-2m-3.5-3.5L3 3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 rounded-xl border border-red-100"><p className="text-red-500 text-xs font-bold text-center animate-pulse">{error}</p></div>}

            <button 
              disabled={loading}
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Đang kiểm tra...' : (isRegister ? 'Đăng ký ngay' : 'Vào ứng dụng')}
            </button>
          </form>
        </div>
        
        <div className="text-center mt-10 text-gray-400 text-sm font-bold uppercase tracking-widest italic opacity-50">
          GIVEBACK &bull; Tự nguyện &bull; 100%
        </div>
      </div>
    </div>
  );
};

export default Login;
