
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
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
  const [successMsg, setSuccessMsg] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showDomainGuide, setShowDomainGuide] = useState(false);
  const [showProviderGuide, setShowProviderGuide] = useState<'google' | 'facebook' | null>(null);

  const REDIRECT_URI = "https://giveback-336a1.firebaseapp.com/__/auth/handler";

  const saveUserToFirestore = async (firebaseUser: any, name: string) => {
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    if (!userDoc.exists()) {
      const newUser: User = {
        id: firebaseUser.uid,
        name: name || firebaseUser.displayName || 'Thành viên mới',
        email: firebaseUser.email || '',
        role: (firebaseUser.email === 'admin@giveback.vn' || firebaseUser.email?.includes('de2104')) ? 'admin' : 'user',
        avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=059669&color=fff`,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "users", firebaseUser.uid), newUser);
      return newUser;
    }
    return { ...userDoc.data(), id: firebaseUser.uid } as User;
  };

  const handleSocialLogin = async (providerType: 'google' | 'facebook') => {
    setError('');
    setSuccessMsg('');
    setShowProviderGuide(null);
    setShowDomainGuide(false);
    setLoading(true);
    try {
      const provider = providerType === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
      if (providerType === 'google') {
        (provider as GoogleAuthProvider).addScope('https://www.googleapis.com/auth/userinfo.email');
      } else {
        (provider as FacebookAuthProvider).addScope('email');
      }
      
      const result = await signInWithPopup(auth, provider);
      const userData = await saveUserToFirestore(result.user, result.user.displayName || '');
      
      setShowConfetti(true);
      setSuccessMsg(`Chào mừng ${userData.name} đã gia nhập cộng đồng hiện đại!`);
      setTimeout(() => onLogin(userData.role, userData), 2500);
    } catch (err: any) {
      console.error("Social Auth Error:", err.code, err.message);
      if (err.code === 'auth/unauthorized-domain') {
        setShowDomainGuide(true);
        setError("Lỗi chặn tên miền (Unauthorized Domain)");
      } else if (err.code === 'auth/operation-not-allowed') {
        setShowProviderGuide(providerType);
        setError(`Tính năng đăng nhập bằng ${providerType === 'google' ? 'Google' : 'Facebook'} chưa được bật!`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Đệ đã tắt cửa sổ đăng nhập mất rồi.");
      } else if (err.message.includes('Invalid Scopes')) {
        setShowProviderGuide('facebook');
        setError("Lỗi quyền Email: Đệ cần vào Facebook Developer > Use Cases > Thêm quyền 'email' nhé!");
      } else {
        setError(`Lỗi: ${err.message}. Đệ kiểm tra lại cấu hình nhé!`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if ((email.toLowerCase() === 'de2104' || email === 'admin@giveback.vn' || email === 'de2104@gmail.com') && password === '21042005de') {
      setShowConfetti(true);
      onLogin('admin', {
        id: 'admin-manual',
        name: 'Đệ (Admin)',
        email: email.includes('@') ? email : 'de2104@giveback.vn',
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=059669&color=fff'
      });
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: fullName });
        const newUser = await saveUserToFirestore(userCredential.user, fullName);
        setShowConfetti(true);
        setSuccessMsg("Đăng ký thành công! Đang vào nhà...");
        setTimeout(() => onLogin('user', newUser), 2000);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userData = await saveUserToFirestore(userCredential.user, userCredential.user.displayName || '');
        onLogin(userData.role, userData);
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') setError('Thông tin không chính xác.');
      else if (err.code === 'auth/email-already-in-use') setError('Email này đã có người dùng.');
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f0f9f6] relative overflow-hidden">
      {/* Confetti Particles */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-[100]">
          {[...Array(50)].map((_, i) => (
            <div 
              key={i} 
              className="confetti-particle"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#10b981', '#fbbf24', '#3b82f6', '#f87171'][Math.floor(Math.random() * 4)],
                animationDelay: `${Math.random() * 2}s`,
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
              }}
            ></div>
          ))}
        </div>
      )}

      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-200/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-teal-200/20 rounded-full blur-[120px] animate-pulse"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-block bg-emerald-600 p-5 rounded-[2.2rem] shadow-2xl shadow-emerald-200 mb-6 group transition-all hover:rotate-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-emerald-950 italic tracking-tighter uppercase mb-1">GIVEBACK</h1>
          <p className="text-emerald-700/60 font-black text-[10px] tracking-[0.4em] uppercase opacity-70">Xác thực hệ thống hiện đại</p>
        </div>

        <div className="bg-white/80 backdrop-blur-3xl p-8 md:p-10 rounded-[3.5rem] shadow-[0_40px_100px_rgba(5,150,105,0.12)] border border-white relative overflow-hidden">
          {loading && <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 animate-loading-bar w-full"></div>}
          
          <div className="flex mb-8 bg-gray-100/40 p-1.5 rounded-2xl border border-gray-100">
            <button onClick={() => { setIsRegister(false); setError(''); setShowProviderGuide(null); }} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${!isRegister ? 'bg-white text-emerald-700 shadow-lg shadow-emerald-100/50' : 'text-gray-400 hover:text-gray-600'}`}>Đăng nhập</button>
            <button onClick={() => { setIsRegister(true); setError(''); setShowProviderGuide(null); }} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isRegister ? 'bg-white text-emerald-700 shadow-lg shadow-emerald-100/50' : 'text-gray-400 hover:text-gray-600'}`}>Tạo tài khoản</button>
          </div>

          <div className="space-y-4 mb-8">
            <button 
              type="button" 
              disabled={loading}
              onClick={() => handleSocialLogin('google')} 
              className="w-full flex items-center justify-center space-x-4 bg-white border-2 border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/10 py-4 rounded-2xl transition-all shadow-sm active:scale-[0.98] group"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 group-hover:scale-110 transition-transform" alt="Google" />
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-700">Đăng nhập bằng Google</span>
            </button>
            
            <button 
              type="button" 
              disabled={loading}
              onClick={() => handleSocialLogin('facebook')} 
              className="w-full flex items-center justify-center space-x-4 bg-[#1877F2] hover:bg-[#166fe5] py-4 rounded-2xl transition-all shadow-lg shadow-blue-100 active:scale-[0.98] group"
            >
              <svg className="w-6 h-6 text-white fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              <span className="text-[11px] font-black uppercase tracking-wider text-white">Đăng nhập bằng Facebook</span>
            </button>
          </div>

          <div className="relative py-4 flex items-center mb-4">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-[9px] font-black text-gray-300 uppercase tracking-widest">Hoặc Email cá nhân</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="animate-in slide-in-from-top-4 duration-300">
                <input required type="text" className="w-full px-6 py-4 rounded-2xl bg-gray-50/50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-gray-700 transition-all" placeholder="Họ và Tên của Đệ" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            )}
            
            <input required type="email" className="w-full px-6 py-4 rounded-2xl bg-gray-50/50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-gray-700 transition-all" placeholder="Email (ví dụ: de2104@gmail.com)" value={email} onChange={(e) => setEmail(e.target.value)} />

            <div className="relative">
              <input required type={showPassword ? "text" : "password"} className="w-full px-6 py-4 rounded-2xl bg-gray-50/50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-gray-700 transition-all" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-emerald-600 transition-colors">
                {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.024 10.024 0 014.13-5.541M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 21l-2-2m-3.5-3.5L3 3" /></svg>}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 animate-in shake-200">
                <p className="text-red-600 text-[10px] font-bold text-center leading-relaxed italic">{error}</p>
                
                {showDomainGuide && (
                  <div className="mt-3 p-4 bg-white rounded-2xl border border-red-200 shadow-lg text-left">
                    <p className="text-[10px] text-gray-900 font-black uppercase mb-3 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-ping"></span>
                      Cách sửa lỗi Domain:
                    </p>
                    <div className="space-y-3">
                       <p className="text-[9px] text-gray-500 font-medium italic">Vào <b>Firebase Console</b> &gt; Auth &gt; Settings &gt; Authorized Domains &gt; Nhấn <b>Add Domain</b> và Paste dòng này:</p>
                       <div className="bg-red-50 p-2 rounded-lg border border-red-100 flex items-center justify-between group cursor-pointer" onClick={() => { navigator.clipboard.writeText(window.location.hostname); alert("Đã copy hostname!"); }}>
                          <code className="text-[11px] font-black text-red-600 font-mono">{window.location.hostname}</code>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                       </div>
                    </div>
                  </div>
                )}

                {showProviderGuide && (
                  <div className="mt-3 p-4 bg-white rounded-2xl border border-blue-200 shadow-lg text-left">
                    <p className="text-[10px] text-blue-900 font-black uppercase mb-3 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                      {showProviderGuide === 'facebook' ? 'Hướng dẫn lấy quyền Email:' : 'Huynh chỉ Đệ cách bật GOOGLE:'}
                    </p>
                    <div className="space-y-3">
                       {showProviderGuide === 'facebook' ? (
                         <>
                           <p className="text-[9px] text-gray-600 font-medium leading-relaxed">1. Vào <b>Trường hợp sử dụng</b> &gt; <b>Tùy chỉnh</b>.</p>
                           <p className="text-[9px] text-gray-600 font-medium leading-relaxed">2. Tìm quyền <b>email</b> và nhấn <b>Thêm</b>.</p>
                           <p className="text-[9px] text-gray-600 font-medium leading-relaxed">3. Đảm bảo <b>Redirect URI</b> sau đã được dán vào Settings:</p>
                           <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 flex items-center justify-between group cursor-pointer" onClick={() => { navigator.clipboard.writeText(REDIRECT_URI); alert("Đã copy Redirect URI!"); }}>
                             <code className="text-[10px] font-black text-blue-700 font-mono truncate mr-2">{REDIRECT_URI}</code>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                           </div>
                         </>
                       ) : (
                         <>
                           <p className="text-[9px] text-gray-600 font-medium">1. Vào <b>Firebase Console</b> &gt; <b>Authentication</b>.</p>
                           <p className="text-[9px] text-gray-600 font-medium">2. Sang tab <b>Sign-in method</b> &gt; <b>Add new provider</b>.</p>
                           <p className="text-[9px] text-gray-600 font-medium">3. Chọn <b>Google</b> &gt; <b>Enable</b> và Lưu lại.</p>
                         </>
                       )}
                       <a href="https://console.firebase.google.com/" target="_blank" className="block w-full bg-blue-600 text-white py-2 rounded-xl text-center text-[9px] font-black uppercase">Đến thẳng Firebase Console</a>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {successMsg && (
              <div className="p-6 bg-emerald-600 rounded-[2rem] border border-emerald-400 animate-in zoom-in-95 shadow-2xl shadow-emerald-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                <p className="text-white text-sm font-black text-center italic relative z-10 uppercase tracking-tighter">✨ {successMsg}</p>
              </div>
            )}

            <button disabled={loading} type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50">
              {loading ? 'Hệ thống đang xử lý...' : (isRegister ? 'Xác nhận tạo tài khoản' : 'Bắt đầu trải nghiệm')}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes loading-bar { 0% { width: 0%; left: 0; } 50% { width: 100%; left: 0; } 100% { width: 0%; left: 100%; } }
        .animate-loading-bar { animation: loading-bar 1.5s infinite ease-in-out; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .shake-200 { animation: shake 0.2s ease-in-out 0s 2; }
        
        @keyframes confetti-fall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-particle {
          position: absolute;
          top: 0;
          animation: confetti-fall 3s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default Login;
