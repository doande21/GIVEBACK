
import React, { useState } from 'react';
import { User } from '../types';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider, facebookProvider } from '../services/firebase';

interface LoginProps {
  onLogin: (role: 'user' | 'admin', userData?: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [userType, setUserType] = useState<'individual' | 'organization'>('individual');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const translateError = (errorCode: string, rawMessage?: string) => {
    const msg = (rawMessage || "").toLowerCase();
    if (msg.includes('identitytoolkit') || msg.includes('identity-toolkit')) {
      return '❌ LỖI HỆ THỐNG: Đệ cần đợi 2-5 phút để Google cập nhật API vừa bật nhé!';
    }
    if (msg.includes('unauthorized-domain') || msg.includes('unauthorized domain')) {
      return `❌ LỖI MIỀN: Đệ chưa thêm "${window.location.hostname}" vào Authorized Domains trong Firebase Auth.`;
    }
    switch (errorCode) {
      case 'auth/invalid-credential': return 'Mật khẩu hoặc Email không đúng rồi Đệ ơi.';
      case 'auth/user-not-found': return 'Email này chưa đăng ký thành viên.';
      case 'auth/wrong-password': return 'Mật khẩu không chính xác.';
      case 'auth/email-already-in-use': return 'Email này đã được sử dụng rồi.';
      case 'auth/weak-password': return 'Mật khẩu quá ngắn (cần ít nhất 6 ký tự).';
      case 'auth/network-request-failed': return 'Lỗi mạng, không kết nối được máy chủ.';
      default: return 'Có lỗi xảy ra: ' + (errorCode || 'Vui lòng thử lại');
    }
  };

  const saveUserToFirestore = async (firebaseUser: any, name: string, type: 'individual' | 'organization', customOrgName?: string) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) return { ...userDoc.data(), id: firebaseUser.uid } as User;
    const isDeAdmin = firebaseUser.email?.toLowerCase().includes('de2104') || firebaseUser.email === 'admin@giveback.vn';
    const newUser: User = {
      id: firebaseUser.uid,
      name: name || firebaseUser.displayName || (type === 'organization' ? 'Tổ chức mới' : 'Thành viên mới'),
      email: firebaseUser.email || '',
      userType: type,
      organizationName: customOrgName || (type === 'organization' ? name : ''),
      role: isDeAdmin ? 'admin' : 'user',
      isGuest: false,
      avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${type === 'organization' ? '0369a1' : '059669'}&color=fff`,
      createdAt: new Date().toISOString()
    };
    await setDoc(userDocRef, newUser);
    return newUser;
  };

  const handleSocialLogin = async (provider: any) => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const userData = await saveUserToFirestore(result.user, result.user.displayName || '', 'individual');
      onLogin(userData.role, userData);
    } catch (err: any) { 
      setError(translateError(err.code, err.message)); 
    } finally { setLoading(false); }
  };

  const handleGuestLogin = () => {
    const guestUser: User = {
      id: 'GUEST_' + Math.random().toString(36).substr(2, 9),
      name: 'Khách trải nghiệm',
      email: 'guest@giveback.vn',
      role: 'user',
      userType: 'individual',
      isGuest: true,
      avatar: `https://ui-avatars.com/api/?name=Guest&background=64748b&color=fff`,
      createdAt: new Date().toISOString()
    };
    onLogin('user', guestUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (email === 'de2104@gmail.com' && password === '21042005de') {
      onLogin('admin', { id: 'admin-de', name: 'Đệ Quản Trị', email: email, role: 'admin', userType: 'individual' });
      return;
    }
    setLoading(true);
    try {
      if (!isLoginView) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const nameToUse = userType === 'organization' ? orgName : fullName;
        await updateProfile(cred.user, { displayName: nameToUse });
        const newUser = await saveUserToFirestore(cred.user, nameToUse, userType, orgName);
        onLogin(newUser.role, newUser);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const uDoc = await getDoc(doc(db, "users", cred.user.uid));
        if (uDoc.exists()) {
          onLogin((uDoc.data() as User).role, uDoc.data() as User);
        } else {
          const recoveredUser = await saveUserToFirestore(cred.user, cred.user.displayName || '', 'individual');
          onLogin(recoveredUser.role, recoveredUser);
        }
      }
    } catch (err: any) { setError(translateError(err.code, err.message)); } finally { setLoading(false); }
  };

  const isOrg = userType === 'organization';
  const themeClass = isOrg ? 'bg-blue-600' : 'bg-emerald-600';
  const textTheme = isOrg ? 'text-blue-600' : 'text-emerald-600';

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-1000 ${isOrg ? 'bg-blue-50' : 'bg-emerald-50'}`}>
      <div className="relative w-full max-w-[950px] bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* PANEL TRÁI: FORM */}
        <div className="flex-1 p-8 md:p-14 flex flex-col justify-center relative z-10">
          <div className="mb-8">
            <h2 className={`text-4xl font-black italic uppercase tracking-tighter mb-2 ${isOrg ? 'text-blue-950' : 'text-emerald-950'}`}>
              {isLoginView ? 'Đăng nhập' : 'Đăng ký'}
            </h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
              {isLoginView ? 'Chào mừng Đệ quay trở lại' : 'Trở thành một phần của GIVEBACK'}
            </p>
          </div>

          {!isLoginView && (
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-2xl w-fit">
               <button onClick={() => setUserType('individual')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${!isOrg ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400'}`}>Cá nhân</button>
               <button onClick={() => setUserType('organization')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${isOrg ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Tổ chức</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginView && (
              <input required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-gray-700 text-sm focus:ring-2 focus:ring-emerald-500/20" placeholder={isOrg ? "Tên tổ chức..." : "Họ và tên..."} value={isOrg ? orgName : fullName} onChange={e => isOrg ? setOrgName(e.target.value) : setFullName(e.target.value)} />
            )}
            <input required type="email" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-gray-700 text-sm focus:ring-2 focus:ring-emerald-500/20" placeholder="Email của Đệ..." value={email} onChange={e => setEmail(e.target.value)} />
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-gray-700 text-sm focus:ring-2 focus:ring-emerald-500/20" placeholder="Mật khẩu..." value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.024 10.024 0 014.13-5.541M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 21l-2-2m-3.5-3.5L3 3"} /></svg>
              </button>
            </div>
            
            {error && <p className="text-[11px] text-red-600 font-bold bg-red-50 p-4 rounded-2xl border border-red-100 animate-pulse">{error}</p>}
            
            <button type="submit" disabled={loading} className={`w-full py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 ${themeClass}`}>
              {loading ? 'Đang xử lý...' : (isLoginView ? 'Bắt đầu hành trình' : 'Tạo tài khoản ngay')}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
             <div className="flex-1 h-px bg-gray-100"></div>
             <span className="text-[9px] font-black text-gray-300 uppercase italic">Hoặc</span>
             <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
             <button onClick={() => handleSocialLogin(googleProvider)} className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100 group"><img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="" /><span className="text-[8px] font-black uppercase text-gray-400">Google</span></button>
             <button onClick={() => handleSocialLogin(facebookProvider)} className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100 group"><img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="" /><span className="text-[8px] font-black uppercase text-gray-400">Facebook</span></button>
             <button onClick={handleGuestLogin} className={`flex flex-col items-center justify-center gap-2 py-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100 group ${textTheme}`}><span className="text-xl group-hover:scale-110 transition-transform">👤</span><span className="text-[8px] font-black uppercase">Dùng thử</span></button>
          </div>
        </div>

        {/* PANEL PHẢI: OVERLAY VỚI ANIMATION ĐỆ THÍCH */}
        <div className={`flex-1 hidden md:flex flex-col items-center justify-center p-12 text-center text-white relative overflow-hidden transition-colors duration-1000 ${themeClass} scrolling-landscape`}>
          {/* Heart Particles Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <span className="absolute left-[10%] top-[80%] animate-heart text-2xl" style={{ animationDelay: '0s' }}>❤️</span>
            <span className="absolute left-[30%] top-[70%] animate-heart text-xl" style={{ animationDelay: '0.5s' }}>💖</span>
            <span className="absolute left-[60%] top-[85%] animate-heart text-2xl" style={{ animationDelay: '1s' }}>💗</span>
            <span className="absolute left-[80%] top-[75%] animate-heart text-xl" style={{ animationDelay: '1.5s' }}>💝</span>
          </div>

          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          
          <div className="relative z-10 animate-in fade-in zoom-in-95 duration-500">
             <div className="mb-8 flex justify-center">
                <div className="bg-white/20 backdrop-blur-xl p-6 rounded-[3rem] border border-white/30 shadow-2xl">
                   <h1 className="text-5xl font-black italic tracking-tighter leading-none uppercase">
                     {isLoginView ? 'GIVEBACK' : 'Chào mừng!'}
                   </h1>
                </div>
             </div>
             
             <p className="text-base font-bold italic mb-12 leading-relaxed opacity-90 px-4 drop-shadow-md">
               {isLoginView 
                ? '"Yêu thương cho đi là yêu thương còn mãi. Đệ đã sẵn sàng lan tỏa chưa?"'
                : '"Mỗi chuyến đi, một hành trình nhân ái. Hãy bắt đầu cùng chúng tôi ngay hôm nay."'}
             </p>
             
             <button 
              onClick={() => { setIsLoginView(!isLoginView); setError(''); }} 
              className="px-12 py-5 bg-white text-emerald-950 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-2xl active:scale-95"
             >
               {isLoginView ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
             </button>
          </div>

          {/* Truck Animation Container */}
          <div className="absolute bottom-16 w-full flex justify-center">
            <div className="relative">
              <div className="animate-truck text-6xl drop-shadow-2xl">🚚</div>
              <div className="absolute -top-4 -right-2 animate-bounce text-2xl">🎁</div>
              <div className="absolute -top-6 left-2 animate-pulse text-xl">✨</div>
            </div>
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.5em] opacity-50">
            Hành trình nhân ái đang chờ Đệ
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
