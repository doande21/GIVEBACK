
import React, { useState, useEffect } from 'react';
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
  const [error, setError] = useState<string | React.ReactNode>('');
  const [loading, setLoading] = useState(false);

  const [hearts, setHearts] = useState<{id: number, left: string, delay: string}[]>([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setHearts(prev => [
        ...prev.slice(-10), 
        { id: Date.now(), left: Math.random() * 80 + 10 + '%', delay: Math.random() * 2 + 's' }
      ]);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const translateError = (errorCode: string, rawMessage?: string): React.ReactNode => {
    const msg = (rawMessage || "").toLowerCase();
    
    // Bắt lỗi CONFIGURATION_NOT_FOUND - Hướng dẫn Đệ cực chi tiết
    if (msg.includes('configuration_not_found') || errorCode.includes('configuration-not-found')) {
      return (
        <div className="space-y-3 text-left p-2">
          <p className="font-black text-red-700 uppercase text-[11px] italic animate-bounce">🆘 ĐỆ ƠI, LÀM 2 BƯỚC NÀY LÀ XONG NÈ:</p>
          <div className="bg-white/80 p-4 rounded-[1.5rem] border-2 border-red-200 shadow-inner space-y-2">
            <p className="text-[10px] font-bold text-gray-700">1️⃣ Vào tab <b>Sign-in method</b> trong Firebase: Bật <b>Email/Password</b> lên (nhấn Save).</p>
            <p className="text-[10px] font-bold text-gray-700">2️⃣ Vào tab <b>Settings</b> {'->'} <b>Authorized Domains</b>: Thêm <b>giveback-one.vercel.app</b> vào nhé.</p>
            <p className="text-[9px] text-red-500 font-black italic mt-2">* Sau khi làm xong, Đệ F5 (tải lại) trang web là được!</p>
          </div>
        </div>
      );
    }

    if (msg.includes('unauthorized-domain')) {
      return (
        <div className="p-2 text-left">
          <p className="font-black text-red-700 text-[10px]">🌐 CHƯA CẤP PHÉP TÊN MIỀN!</p>
          <p className="text-[9px] font-medium text-gray-600">Đệ vào Firebase {'->'} Auth {'->'} Settings {'->'} Authorized Domains {'->'} Thêm <b>giveback-one.vercel.app</b> vào nhé.</p>
        </div>
      );
    }

    if (msg.includes('api_key_service_blocked') || msg.includes('blocked')) {
      return '🔐 API Key đang bị giới hạn, Đệ vào Google Cloud gỡ giới hạn cho Key này nhé.';
    }

    switch (errorCode) {
      case 'auth/invalid-credential': return 'Mật khẩu hoặc Email không đúng rồi Đệ.';
      case 'auth/email-already-in-use': return 'Email này đã được sử dụng rồi.';
      case 'auth/weak-password': return 'Mật khẩu yếu quá, thêm ký tự đi Đệ.';
      default: return `Lỗi: ${errorCode.split('/')[1] || 'Vui lòng thử lại sau.'}`;
    }
  };

  const saveUserToFirestore = async (firebaseUser: any, name: string, type: 'individual' | 'organization', customOrgName?: string) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) return { ...userDoc.data(), id: firebaseUser.uid } as User;
    
    const isDeAdmin = firebaseUser.email?.toLowerCase().includes('de2104') || firebaseUser.email === 'admin@giveback.vn';
    const newUser: User = {
      id: firebaseUser.uid,
      name: name || firebaseUser.displayName || 'Thành viên mới',
      email: firebaseUser.email || '',
      userType: type,
      organizationName: customOrgName || '',
      role: isDeAdmin ? 'admin' : 'user',
      isGuest: false,
      avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=059669&color=fff`,
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
        if (uDoc.exists()) onLogin((uDoc.data() as User).role, uDoc.data() as User);
        else onLogin('user', await saveUserToFirestore(cred.user, cred.user.displayName || '', 'individual'));
      }
    } catch (err: any) { 
      setError(translateError(err.code, err.message)); 
    } finally { setLoading(false); }
  };

  const isOrg = userType === 'organization';
  const themeClass = isOrg ? 'bg-blue-600' : 'bg-emerald-600';
  const textTheme = isOrg ? 'text-blue-600' : 'text-emerald-600';

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 transition-all duration-1000 ${isOrg ? 'bg-blue-50' : 'bg-emerald-50'}`}>
      <div className="relative w-full max-w-[1000px] bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col md:flex-row min-h-[650px]">
        
        {/* PANEL TRÁI: FORM */}
        <div className="md:w-[55%] p-8 md:p-16 flex flex-col justify-center relative z-10 bg-white">
          <div className="mb-10">
            <h2 className={`text-5xl font-black italic uppercase tracking-tighter mb-3 leading-none ${isOrg ? 'text-blue-950' : 'text-emerald-950'}`}>
              {isLoginView ? 'Đăng nhập' : 'Đăng ký'}
            </h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">
              {isLoginView ? 'Chào mừng Đệ quay trở lại' : 'Trở thành một phần của GIVEBACK'}
            </p>
          </div>

          {!isLoginView && (
            <div className="flex gap-2 mb-8 p-1.5 bg-gray-100 rounded-[2rem] w-fit">
               <button onClick={() => setUserType('individual')} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${!isOrg ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400'}`}>Cá nhân</button>
               <button onClick={() => setUserType('organization')} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${isOrg ? 'bg-white shadow-md text-blue-600' : 'text-gray-400'}`}>Tổ chức</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLoginView && (
              <input required className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-2 border-transparent focus:border-emerald-500/30 outline-none font-bold text-gray-700 text-sm transition-all" placeholder={isOrg ? "Tên tổ chức..." : "Họ và tên..."} value={isOrg ? orgName : fullName} onChange={e => isOrg ? setOrgName(e.target.value) : setFullName(e.target.value)} />
            )}
            <input required type="email" className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-2 border-transparent focus:border-emerald-500/30 outline-none font-bold text-gray-700 text-sm transition-all" placeholder="Email kết nối..." value={email} onChange={e => setEmail(e.target.value)} />
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-2 border-transparent focus:border-emerald-500/30 outline-none font-bold text-gray-700 text-sm transition-all" placeholder="Mật khẩu..." value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 hover:text-emerald-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.024 10.024 0 014.13-5.541M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 21l-2-2m-3.5-3.5L3 3"} /></svg>
              </button>
            </div>
            
            {error && (
              <div className="p-6 bg-red-50 rounded-[2.5rem] border-2 border-red-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                <div className="text-[12px] text-red-700 leading-relaxed font-medium">{error}</div>
              </div>
            )}
            
            <button type="submit" disabled={loading} className={`w-full py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] text-white shadow-2xl transition-all active:scale-95 disabled:opacity-50 ${themeClass}`}>
              {loading ? 'Đang kết nối...' : (isLoginView ? 'Bắt đầu hành trình' : 'Tạo tài khoản ngay')}
            </button>
          </form>

          <div className="mt-10 flex items-center gap-6">
             <div className="flex-1 h-px bg-gray-100"></div>
             <span className="text-[10px] font-black text-gray-300 uppercase italic tracking-widest">Hoặc sẻ chia qua</span>
             <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
             <button onClick={() => handleSocialLogin(googleProvider)} className="flex flex-col items-center justify-center gap-3 py-5 bg-gray-50 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100 group"><img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6 group-hover:scale-110 transition-transform" alt="" /><span className="text-[9px] font-black uppercase text-gray-400">Google</span></button>
             <button onClick={() => handleSocialLogin(facebookProvider)} className="flex flex-col items-center justify-center gap-3 py-5 bg-gray-50 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100 group"><img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-6 h-6 group-hover:scale-110 transition-transform" alt="" /><span className="text-[9px] font-black uppercase text-gray-400">Facebook</span></button>
             <button onClick={handleGuestLogin} className={`flex flex-col items-center justify-center gap-3 py-5 bg-gray-50 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100 group ${textTheme}`}><span className="text-2xl group-hover:scale-110 transition-transform">👤</span><span className="text-[9px] font-black uppercase">Dùng thử</span></button>
          </div>
        </div>

        {/* PANEL PHẢI: ANIMATION */}
        <div className={`md:w-[45%] hidden md:flex flex-col items-center justify-center p-12 text-center text-white relative overflow-hidden transition-all duration-1000 ${themeClass} scrolling-landscape`}>
          {hearts.map(h => (
            <span key={h.id} className="absolute animate-heart text-2xl" style={{ left: h.left, bottom: '-50px', animationDelay: h.delay }}>❤️</span>
          ))}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10 animate-in fade-in zoom-in-95 duration-700">
             <div className="mb-8 inline-block bg-white/20 backdrop-blur-xl p-8 rounded-[4rem] border border-white/30 shadow-2xl">
                <h1 className="text-6xl font-black italic tracking-tighter leading-none uppercase">GIVEBACK</h1>
             </div>
             <p className="text-lg font-bold italic mb-12 leading-relaxed opacity-90 px-6 drop-shadow-xl">
               {isLoginView ? '"Yêu thương cho đi là yêu thương còn mãi."' : '"Mỗi món quà, một hành trình nhân ái."'}
             </p>
             <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="px-14 py-6 bg-white text-emerald-950 rounded-[2.5rem] font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-2xl active:scale-95 border-4 border-emerald-100">
               {isLoginView ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
             </button>
          </div>
          <div className="absolute bottom-20 w-full flex justify-center">
            <div className="relative animate-truck">
              <div className="text-8xl drop-shadow-[0_20px_20px_rgba(0,0,0,0.3)]">🚚</div>
              <div className="absolute -top-6 -right-4 animate-bounce text-4xl">🎁</div>
              <div className="absolute -top-10 left-4 animate-pulse text-2xl">✨</div>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.5em] opacity-60 italic">Hành trình nhân ái cùng Đệ</div>
        </div>
      </div>
    </div>
  );
};

export default Login;
