
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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [userType, setUserType] = useState<'individual' | 'organization'>('individual');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const translateError = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-credential': return 'Mật khẩu hoặc Email không đúng đệ ơi.';
      case 'auth/user-not-found': return 'Email này chưa đăng ký đâu.';
      case 'auth/wrong-password': return 'Mật khẩu sai rồi.';
      case 'auth/email-already-in-use': return 'Email này đã có người dùng rồi.';
      case 'auth/popup-blocked': return 'Trình duyệt chặn cửa sổ đăng nhập rồi đệ.';
      default: return 'Lỗi: ' + errorCode;
    }
  };

  const saveUserToFirestore = async (firebaseUser: any, name: string, type: 'individual' | 'organization', customOrgName?: string) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return { ...userDoc.data(), id: firebaseUser.uid } as User;
    }

    const isDe = firebaseUser.email?.toLowerCase().includes('de2104') || firebaseUser.email === 'admin@giveback.vn';

    const newUser: User = {
      id: firebaseUser.uid,
      name: name || firebaseUser.displayName || (type === 'organization' ? 'Tổ chức mới' : 'Thành viên mới'),
      email: firebaseUser.email || '',
      userType: type,
      organizationName: customOrgName || (type === 'organization' ? name : ''),
      role: isDe ? 'admin' : 'user',
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
      const userData = await saveUserToFirestore(result.user, result.user.displayName || '', userType);
      setSuccessMsg(`Chào mừng ${userData.name}!`);
      setTimeout(() => onLogin(userData.role, userData), 800);
    } catch (err: any) {
      setError(translateError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');

    // LỐI TẮT CHO ĐỆ ĐỂ TEST NHANH
    const isDeManual = email.toLowerCase().includes('de2104') || email === 'admin@giveback.vn';
    if (isDeManual && password === '21042005de') {
      onLogin('admin', { 
        id: 'admin-de-manual', 
        name: 'Đệ Đại Nhân', 
        email: 'de2104@gmail.com', 
        role: 'admin', 
        userType: 'individual',
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=059669&color=fff' 
      });
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const nameToUse = userType === 'organization' ? orgName : fullName;
        await updateProfile(cred.user, { displayName: nameToUse });
        const newUser = await saveUserToFirestore(cred.user, nameToUse, userType, orgName);
        setSuccessMsg("Đăng ký thành công!");
        setTimeout(() => onLogin(newUser.role, newUser), 1000);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const uDoc = await getDoc(doc(db, "users", cred.user.uid));
        if (uDoc.exists()) {
          const userData = uDoc.data() as User;
          setSuccessMsg("Vào thôi!");
          setTimeout(() => onLogin(userData.role, userData), 800);
        } else {
          // Phòng trường hợp user có Auth nhưng mất Doc
          const recoveredUser = await saveUserToFirestore(cred.user, cred.user.displayName || '', 'individual');
          onLogin(recoveredUser.role, recoveredUser);
        }
      }
    } catch (err: any) { 
      setError(translateError(err.code)); 
    } finally { 
      setLoading(false); 
    }
  };

  const isOrg = userType === 'organization';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-1000 ${isOrg ? 'bg-blue-100' : 'bg-emerald-100'}`}>
      
      {/* ANIMATED BACKGROUND LAYER (TRUCK & PARALLAX) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[5%] w-24 h-12 bg-white/60 rounded-full blur-md animate-pulse"></div>
        <div className="absolute top-[15%] right-[15%] w-32 h-16 bg-white/40 rounded-full blur-lg animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 left-0 right-0 h-40 opacity-30 scrolling-landscape" style={{animationDuration: '60s', filter: 'hue-rotate(10deg)'}}>
            <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-[200%] h-full">
                <path d="M0,100 C150,20 350,80 500,50 C650,20 850,80 1000,50 L1000,100 L0,100 Z" fill={isOrg ? '#1e3a8a' : '#064e3b'} />
            </svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gray-800/10 scrolling-landscape" style={{animationDuration: '5s'}}>
            <div className="w-full h-1 bg-white/20 absolute top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/10"></div>
        </div>
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 md:left-[20%] transition-all duration-1000">
            <div className="relative animate-truck">
                <div className="absolute top-0 left-10 text-red-500 animate-heart" style={{animationDelay: '0s'}}>❤️</div>
                <div className="absolute top-0 left-16 text-pink-400 animate-heart" style={{animationDelay: '0.7s'}}>❤️</div>
                <div className="absolute top-0 left-24 text-red-400 animate-heart" style={{animationDelay: '1.4s'}}>❤️</div>
                <div className="relative w-48 h-24">
                    <div className="absolute -top-6 left-2 flex gap-1 items-end">
                        <div className="w-8 h-8 bg-amber-400 rounded-lg shadow-md border-2 border-amber-500 flex items-center justify-center font-black text-white text-[10px]">🎁</div>
                        <div className="w-10 h-10 bg-red-400 rounded-lg shadow-md border-2 border-red-500 mb-1 flex items-center justify-center font-black text-white text-[10px]">🎁</div>
                        <div className="w-7 h-7 bg-blue-400 rounded-lg shadow-md border-2 border-blue-500 flex items-center justify-center font-black text-white text-[10px]">🎁</div>
                        <div className="w-9 h-9 bg-emerald-400 rounded-lg shadow-md border-2 border-emerald-500 mb-2 flex items-center justify-center font-black text-white text-[10px]">🎁</div>
                    </div>
                    <div className={`w-32 h-16 rounded-lg shadow-xl relative z-10 ${isOrg ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                            <span className="text-[10px] font-black italic tracking-tighter text-white">GIVEBACK</span>
                        </div>
                    </div>
                    <div className={`absolute bottom-0 right-[-30px] w-14 h-12 rounded-tr-3xl rounded-br-lg shadow-lg ${isOrg ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                        <div className="absolute top-2 right-2 w-6 h-4 bg-sky-200 rounded-tr-xl opacity-80"></div>
                    </div>
                    <div className="absolute -bottom-3 left-4 w-8 h-8 bg-gray-900 rounded-full border-4 border-gray-700 animate-wheel">
                        <div className="w-full h-1 bg-gray-600 absolute top-1/2 -translate-y-1/2"></div>
                        <div className="h-full w-1 bg-gray-600 absolute left-1/2 -translate-x-1/2"></div>
                    </div>
                    <div className="absolute -bottom-3 right-0 w-8 h-8 bg-gray-900 rounded-full border-4 border-gray-700 animate-wheel">
                        <div className="w-full h-1 bg-gray-600 absolute top-1/2 -translate-y-1/2"></div>
                        <div className="h-full w-1 bg-gray-600 absolute left-1/2 -translate-x-1/2"></div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* LOGIN FORM */}
      <div className="w-full max-w-[420px] relative z-10 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center">
          <h1 className={`text-5xl font-black italic uppercase tracking-tighter leading-none transition-colors duration-1000 ${isOrg ? 'text-blue-950' : 'text-emerald-950'}`}>GIVEBACK</h1>
          <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-2 transition-colors duration-1000 ${isOrg ? 'text-blue-600' : 'text-emerald-600'}`}>
            Mỗi chuyến đi, một hành trình nhân ái
          </p>
        </div>

        <div className="bg-white/60 backdrop-blur-2xl p-8 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/50">
          <div className="flex mb-6 bg-gray-200/40 p-1.5 rounded-2xl shadow-inner">
            <button onClick={() => setAuthMode('login')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${authMode === 'login' ? 'bg-white shadow-md ' + (isOrg ? 'text-blue-700' : 'text-emerald-700') : 'text-gray-400'}`}>Đăng nhập</button>
            <button onClick={() => setAuthMode('register')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${authMode === 'register' ? 'bg-white shadow-md ' + (isOrg ? 'text-blue-700' : 'text-emerald-700') : 'text-gray-400'}`}>Đăng ký</button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button type="button" onClick={() => setUserType('individual')} className={`py-3 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${userType === 'individual' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-50' : 'bg-white/50 border-gray-100 text-gray-400'}`}>Cá nhân</button>
            <button type="button" onClick={() => setUserType('organization')} className={`py-3 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${userType === 'organization' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-lg shadow-blue-50' : 'bg-white/50 border-gray-100 text-gray-400'}`}>Tổ chức</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'register' && (
              <input required className="w-full px-6 py-4 rounded-2xl bg-white/80 border border-white/40 outline-none font-bold text-gray-700 text-sm focus:ring-4 transition-all focus:ring-emerald-100" placeholder={isOrg ? "Tên Tổ chức" : "Họ và tên"} value={isOrg ? orgName : fullName} onChange={e => isOrg ? setOrgName(e.target.value) : setFullName(e.target.value)} />
            )}
            <input required type="email" className="w-full px-6 py-4 rounded-2xl bg-white/80 border border-white/40 outline-none font-bold text-gray-700 text-sm focus:ring-4 transition-all focus:ring-emerald-100" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} className="w-full px-6 py-4 rounded-2xl bg-white/80 border border-white/40 outline-none font-bold text-gray-700 text-sm focus:ring-4 transition-all focus:ring-emerald-100" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300">
                {showPassword ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.024 10.024 0 014.13-5.541M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 21l-2-2m-3.5-3.5L3 3" /></svg>}
              </button>
            </div>

            {error && <p className="text-[10px] text-red-600 font-bold bg-red-50 p-3 rounded-xl italic">{error}</p>}
            {successMsg && <p className={`text-[10px] font-bold p-3 rounded-xl italic ${isOrg ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{successMsg}</p>}

            <button disabled={loading} type="submit" className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl transition-all text-white mt-2 ${isOrg ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {loading ? 'ĐANG XỬ LÝ...' : authMode === 'login' ? 'BẮT ĐẦU HÀNH TRÌNH' : 'ĐĂNG KÝ NGAY'}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <span className="relative bg-white/80 px-4 text-[9px] font-black text-red-600 uppercase tracking-widest">Hoặc dùng MXH</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleSocialLogin(googleProvider)} className="flex items-center justify-center gap-2 border border-white/80 py-3.5 rounded-2xl hover:bg-white transition-all active:scale-95 shadow-sm bg-white/40">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5.04c1.9 0 3.61.65 4.95 1.93l3.71-3.71C18.41 1.25 15.42 0 12 0 7.34 0 3.4 2.68 1.5 6.6l4.31 3.34C6.83 7.07 9.2 5.04 12 5.04z"/><path fill="#4285F4" d="M23.49 12.27c0-.8-.07-1.57-.21-2.31H12v4.38h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.71 2.88c2.17-2 3.72-4.94 3.72-8.53z"/><path fill="#FBBC05" d="M5.81 14.18c-.23-.69-.36-1.43-.36-2.18s.13-1.49.36-2.18L1.5 6.48C.54 8.35 0 10.11 0 12s.54 3.65 1.5 5.52l4.31-3.34z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.71-2.88c-1.1.73-2.51 1.17-4.24 1.17-3.27 0-6.04-2.21-7.03-5.2l-4.31 3.34C3.4 21.32 7.34 24 12 24z"/></svg>
              <span className="text-[10px] font-black uppercase text-gray-600">Google</span>
            </button>
            <button onClick={() => handleSocialLogin(facebookProvider)} className="flex items-center justify-center gap-2 border border-white/80 py-3.5 rounded-2xl hover:bg-white transition-all active:scale-95 shadow-sm bg-white/40">
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              <span className="text-[10px] font-black uppercase text-gray-600">Facebook</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
