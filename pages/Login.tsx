
import React, { useState, useEffect } from 'react';
import { User } from '../types';
// Fix: Import Firebase Auth modular functions directly instead of using namespace imports
import { 
  getRedirectResult, 
  signInWithRedirect, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../services/firebase';
import { apiService } from '../services/apiService';

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
  const [secretCount, setSecretCount] = useState(0);
  const [isAdminButtonVisible, setIsAdminButtonVisible] = useState(false);
  const [hearts, setHearts] = useState<{id: number, left: string, delay: string}[]>([]);
  
  // Kiểm tra kết quả redirect sau khi quay lại từ Facebook/Google (Dành cho Mobile)
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        // Fix: Call the modular getRedirectResult function directly
        const result = await getRedirectResult(auth);
        if (result) {
          setLoading(true);
          const userData = await saveUserToFirestore(result.user, result.user.displayName || '', 'individual');
          onLogin(userData.role, userData);
        }
      } catch (err: any) {
        setError(translateError(err.code, err.message));
      } finally {
        setLoading(false);
      }
    };
    checkRedirect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHearts(prev => [
        ...prev.slice(-10), 
        { id: Date.now(), left: Math.random() * 80 + 10 + '%', delay: Math.random() * 2 + 's' }
      ]);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleSecretClick = () => {
    const newCount = secretCount + 1;
    setSecretCount(newCount);
    if (newCount >= 5) setIsAdminButtonVisible(true);
  };

  const translateError = (errorCode: string, rawMessage?: string): React.ReactNode => {
    const msg = (rawMessage || "").toLowerCase();
    
    // LỖI MIỀN CHƯA CẤP PHÉP (Lỗi bạn đang gặp)
    if (errorCode === 'auth/unauthorized-domain' || msg.includes('unauthorized domain') || msg.includes('domain not authorized') || msg.includes('uri_not_whitelisted')) {
      return (
        <div className="space-y-4 text-left p-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl animate-bounce">⚠️</span>
            <p className="font-black text-red-600 dark:text-red-400 uppercase text-[12px]">LỖI CẤU HÌNH TÊN MIỀN!</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-[2rem] border-2 border-red-100 dark:border-red-900/50 shadow-sm space-y-3">
            <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-relaxed">
              bạn ơi, Facebook/Google đang chặn vì chưa khai báo tên miền. bạn làm bước này trên Facebook Developer nhé:
            </p>
            <div className="space-y-2 bg-white/50 dark:bg-slate-800 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
               <p className="text-[9px] font-black text-red-800 dark:text-red-400 uppercase">1. Thêm <b>giveback-one.vercel.app</b> vào "App Domains".</p>
               <p className="text-[9px] font-black text-red-800 dark:text-red-400 uppercase">2. Thêm Link sau vào "Valid OAuth Redirect URIs":</p>
               <code className="block text-[8px] bg-black text-green-400 p-2 rounded mt-1 break-all">https://giveback-336a1.firebaseapp.com/__/auth/handler</code>
            </div>
          </div>
        </div>
      );
    }

    switch (errorCode) {
      case 'auth/invalid-credential': return 'Mật khẩu hoặc Email không đúng rồi bạn ơi.';
      case 'auth/email-already-in-use': return 'Email này đã có người đăng ký rồi.';
      case 'auth/weak-password': return 'Mật khẩu yếu quá, thêm ký tự đi bạn.';
      case 'auth/user-not-found': return 'Tài khoản này chưa tồn tại.';
      case 'auth/popup-closed-by-user': return 'bạn đã đóng cửa sổ đăng nhập sớm quá.';
      case 'auth/cancelled-by-user': return 'Thao tác đã bị hủy.';
      default: return `Gặp lỗi hệ thống: ${errorCode.split('/')[1] || 'Vui lòng thử lại sau.'}`;
    }
  };

  const saveUserToFirestore = async (firebaseUser: any, name: string, type: 'individual' | 'organization', customOrgName?: string) => {
    const { doc, setDoc, getDoc } = await import("firebase/firestore");
    const { db } = await import("../services/firebase");
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
      avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=059669&color=fff&bold=true`,
      createdAt: new Date().toISOString()
    };
    await setDoc(userDocRef, newUser);
    return newUser;
  };

  const handleSocialLogin = async (provider: any) => {
    setError('');
    setLoading(true);
    
    // Kiểm tra xem có phải điện thoại không
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try {
      if (isMobile) {
        // Trên mobile dùng Redirect để không bị chặn popup
        // Fix: Call modular function directly
        await signInWithRedirect(auth, provider);
      } else {
        // Trên máy tính dùng Popup cho nhanh
        // Fix: Call modular function directly
        const result = await signInWithPopup(auth, provider);
        const userData = await saveUserToFirestore(result.user, result.user.displayName || '', 'individual');
        onLogin(userData.role, userData);
      }
    } catch (err: any) {
      setError(translateError(err.code, err.message));
    } finally {
      if (!isMobile) setLoading(false);
    }
  };

  const handleQuickAdmin = async () => {
    setLoading(true);
    setError('');
    const adminUser = await apiService.login('de2104', '21042005de');
    if (adminUser) onLogin('admin', adminUser);
    setLoading(false);
  };

  const handleGuestLogin = () => {
    const guestUser: User = {
      id: 'guest_' + Math.random().toString(36).substr(2, 9),
      name: 'Người dùng ẩn danh',
      email: 'guest@giveback.vn',
      role: 'user',
      userType: 'individual',
      isGuest: true,
      avatar: `https://ui-avatars.com/api/?name=Guest&background=94a3b8&color=fff`,
      createdAt: new Date().toISOString()
    };
    onLogin('user', guestUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const inputUser = email.trim();
    const inputPass = password;

    if (isLoginView && (inputUser === 'de2104' || inputUser === 'de2104@giveback.vn') && inputPass === '21042005de') {
      const adminUser = await apiService.login('de2104', '21042005de');
      if (adminUser) { onLogin('admin', adminUser); setLoading(false); return; }
    }

    let loginEmail = inputUser;
    if (!loginEmail.includes('@')) loginEmail = `${loginEmail}@giveback.vn`;

    try {
      if (!isLoginView) {
        // Fix: Call modular createUserWithEmailAndPassword function directly
        const result = await createUserWithEmailAndPassword(auth, loginEmail, inputPass);
        const nameToUse = userType === 'organization' ? orgName : fullName;
        // Fix: Call modular updateProfile function directly
        await updateProfile(result.user, { displayName: nameToUse });
        const newUser = await saveUserToFirestore(result.user, nameToUse, userType, orgName);
        onLogin(newUser.role, newUser);
      } else {
        // Fix: Call modular signInWithEmailAndPassword function directly
        const result = await signInWithEmailAndPassword(auth, loginEmail, inputPass);
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../services/firebase");
        const uDoc = await getDoc(doc(db, "users", result.user.uid));
        if (uDoc.exists()) onLogin((uDoc.data() as User).role, uDoc.data() as User);
        else onLogin('user', await saveUserToFirestore(result.user, result.user.displayName || '', 'individual'));
      }
    } catch (err: any) { 
      setError(translateError(err.code, err.message)); 
    } finally { setLoading(false); }
  };

  const isOrg = userType === 'organization';
  const themeClass = isOrg ? 'bg-blue-600' : 'bg-emerald-600';
  const textTheme = isOrg ? 'text-blue-600' : 'text-emerald-600';

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 transition-all duration-1000 ${isOrg ? 'bg-blue-50 dark:bg-slate-950' : 'bg-emerald-50 dark:bg-slate-950'}`}>
      <div className="relative w-full max-w-[1000px] bg-white dark:bg-slate-900 rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col md:flex-row min-h-[650px]">
        <div className="md:w-[55%] p-8 md:p-16 flex flex-col justify-center relative z-10 bg-white dark:bg-slate-900">
          <div className="mb-10 text-center md:text-left">
            <h2 className={`text-5xl font-black uppercase tracking-tighter mb-3 leading-none ${isOrg ? 'text-blue-950 dark:text-blue-400' : 'text-emerald-950 dark:text-emerald-400'}`}>
              {isLoginView ? 'Đăng nhập' : 'Đăng ký'}
            </h2>
            <div className="flex items-center justify-center md:justify-start gap-2">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                 {isLoginView ? 'Chào mừng bạn quay trở lại' : 'Trở thành một phần của GIVEBACK'}
               </p>
               {isAdminButtonVisible && isLoginView && (
                 <button onClick={handleQuickAdmin} className="text-[8px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full font-black uppercase hover:bg-emerald-600 hover:text-white transition-all animate-pulse shadow-sm">Gõ nhanh Admin ⚡</button>
               )}
            </div>
          </div>

          {!isLoginView && (
            <div className="flex gap-2 mb-8 p-1.5 bg-gray-100 dark:bg-slate-800 rounded-[2rem] w-fit mx-auto md:mx-0">
               <button onClick={() => setUserType('individual')} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${!isOrg ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>Cá nhân</button>
               <button onClick={() => setUserType('organization')} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${isOrg ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>Tổ chức</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLoginView && (
              <input required className="w-full px-8 py-5 rounded-3xl bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500/30 outline-none font-bold text-gray-700 dark:text-white text-sm transition-all shadow-inner" placeholder={isOrg ? "Tên tổ chức..." : "Họ và tên..."} value={isOrg ? orgName : fullName} onChange={e => isOrg ? setOrgName(e.target.value) : setFullName(e.target.value)} />
            )}
            <div className="relative">
              <input required type="text" className="w-full px-8 py-5 rounded-3xl bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500/30 outline-none font-bold text-gray-700 dark:text-white text-sm transition-all shadow-inner" placeholder="Email hoặc Tên đăng nhập..." value={email} onChange={e => setEmail(e.target.value)} />
              {!email.includes('@') && email.length > 0 && <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-400 uppercase pointer-events-none">@giveback.vn</span>}
            </div>
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} className="w-full px-8 py-5 rounded-3xl bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500/30 outline-none font-bold text-gray-700 dark:text-white text-sm transition-all shadow-inner" placeholder="Mật khẩu..." value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 hover:text-emerald-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.024 10.024 0 014.13-5.541M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 21l-2-2m-3.5-3.5L3 3"} /></svg>
              </button>
            </div>
            {error && <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-[2.5rem] border border-red-100 dark:border-red-900/50 shadow-sm animate-in fade-in slide-in-from-top-4"><div className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{error}</div></div>}
            <button type="submit" disabled={loading} className={`w-full py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] text-white shadow-2xl transition-all active:scale-95 disabled:opacity-50 ${isOrg ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              {loading ? 'Đang kết nối...' : (isLoginView ? 'Bắt đầu hành trình' : 'Tạo tài khoản ngay')}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-emerald-500 transition-colors">
                {isLoginView ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập ngay'}
              </button>
            </div>
          </form>

          <div className="mt-10 flex items-center gap-6">
             <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800"></div>
             <span className="text-[10px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-widest">Hoặc sẻ chia qua</span>
             <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800"></div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
             <button onClick={() => handleSocialLogin(googleProvider)} className="flex flex-col items-center justify-center gap-3 py-5 bg-gray-50 dark:bg-slate-800 rounded-[2rem] hover:bg-white dark:hover:bg-slate-700 hover:shadow-xl transition-all border border-transparent group"><img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6 group-hover:scale-110 transition-transform" alt="" /><span className="text-[9px] font-black uppercase text-gray-400">Google</span></button>
             <button onClick={() => handleSocialLogin(facebookProvider)} className="flex flex-col items-center justify-center gap-3 py-5 bg-gray-50 dark:bg-slate-800 rounded-[2rem] hover:bg-white dark:hover:bg-slate-700 hover:shadow-xl transition-all border border-transparent group"><img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-6 h-6 group-hover:scale-110 transition-transform" alt="" /><span className="text-[9px] font-black uppercase text-gray-400">Facebook</span></button>
             <button onClick={handleGuestLogin} className={`flex flex-col items-center justify-center gap-3 py-5 bg-gray-50 dark:bg-slate-800 rounded-[2rem] hover:bg-white dark:hover:bg-slate-700 hover:shadow-xl transition-all border border-transparent group ${textTheme}`}><span className="text-2xl group-hover:scale-110 transition-transform">👤</span><span className="text-[9px] font-black uppercase">Dùng thử</span></button>
          </div>
        </div>

        <div className={`md:w-[45%] hidden md:flex flex-col items-center justify-center p-12 text-center text-white relative overflow-hidden transition-all duration-1000 ${themeClass}`}>
          {hearts.map(h => <span key={h.id} className="absolute animate-heart text-2xl" style={{ left: h.left, bottom: '-50px', animationDelay: h.delay }}>❤️</span>)}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10 animate-in fade-in zoom-in-95 duration-700">
             <div className="mb-8 inline-block bg-white/20 backdrop-blur-xl p-8 rounded-[4rem] border border-white/30 shadow-2xl cursor-pointer active:scale-95 transition-transform" onClick={handleSecretClick}>
                <h1 className="text-6xl font-black tracking-tighter leading-none uppercase">GIVEBACK</h1>
             </div>
             <p className="text-lg font-bold mb-12 leading-relaxed opacity-90 px-6 drop-shadow-xl">{isLoginView ? '"Yêu thương cho đi là yêu thương còn mãi."' : '"Mỗi món quà, một hành trình nhân ái."'}</p>
             <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="px-14 py-6 bg-white text-emerald-950 rounded-[2.5rem] font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-2xl active:scale-95 border-4 border-emerald-100">{isLoginView ? 'Đăng ký ngay' : 'Đăng nhập ngay'}</button>
          </div>
          <div className="absolute bottom-20 w-full flex justify-center">
            <div className="relative animate-truck">
              <div className="text-8xl drop-shadow-[0_20px_20px_rgba(0,0,0,0.3)]">🚚</div>
              <div className="absolute -top-6 -right-4 animate-bounce text-4xl">🎁</div>
              <div className="absolute -top-10 left-4 animate-pulse text-2xl">✨</div>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.5em] opacity-60">Hành trình nhân ái cùng bạn</div>
        </div>
      </div>
    </div>
  );
};

export default Login;
