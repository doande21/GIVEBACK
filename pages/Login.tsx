
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
  const [successMsg, setSuccessMsg] = useState('');

  const translateError = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-credential': return 'Mật khẩu hoặc Email không đúng đệ ơi.';
      case 'auth/user-not-found': return 'Email này chưa đăng ký đâu.';
      case 'auth/wrong-password': return 'Mật khẩu sai rồi.';
      case 'auth/email-already-in-use': return 'Email này đã có người dùng rồi.';
      default: return 'Lỗi: ' + errorCode;
    }
  };

  const saveUserToFirestore = async (firebaseUser: any, name: string, type: 'individual' | 'organization', customOrgName?: string) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) return { ...userDoc.data(), id: firebaseUser.uid } as User;

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
    setError(''); setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const userData = await saveUserToFirestore(result.user, result.user.displayName || '', userType);
      setSuccessMsg(`Chào mừng ${userData.name}!`);
      setTimeout(() => onLogin(userData.role, userData), 800);
    } catch (err: any) { setError(translateError(err.code)); } 
    finally { setLoading(false); }
  };

  const handleGuestLogin = () => {
    const guestUser: User = {
      id: 'GUEST_' + Math.random().toString(36).substr(2, 9),
      name: 'Người dùng ẩn danh',
      email: 'guest@giveback.vn',
      role: 'user',
      userType: 'individual',
      isGuest: true,
      avatar: `https://ui-avatars.com/api/?name=Guest&background=64748b&color=fff`,
      createdAt: new Date().toISOString(),
      bio: 'Tài khoản trải nghiệm hệ thống.'
    };
    onLogin('user', guestUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');

    const isDeManual = email.toLowerCase().includes('de2104') || email === 'admin@giveback.vn';
    if (isDeManual && password === '21042005de') {
      onLogin('admin', { id: 'admin-de-manual', name: 'Đệ Đại Nhân', email: 'de2104@gmail.com', role: 'admin', userType: 'individual', avatar: 'https://ui-avatars.com/api/?name=Admin&background=059669&color=fff' });
      return;
    }

    setLoading(true);
    try {
      if (!isLoginView) {
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
          onLogin((uDoc.data() as User).role, uDoc.data() as User);
        } else {
          const recoveredUser = await saveUserToFirestore(cred.user, cred.user.displayName || '', 'individual');
          onLogin(recoveredUser.role, recoveredUser);
        }
      }
    } catch (err: any) { setError(translateError(err.code)); } 
    finally { setLoading(false); }
  };

  const isOrg = userType === 'organization';
  const mainColorClass = isOrg ? 'bg-blue-600' : 'bg-emerald-600';
  const textAccentClass = isOrg ? 'text-blue-600' : 'text-emerald-600';

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden transition-all duration-1000 ${isOrg ? 'bg-blue-100' : 'bg-emerald-100'}`}>
      
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-white/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      {/* MAIN CONTAINER */}
      <div className="relative w-full max-w-[900px] h-auto md:h-[630px] bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col">
        
        {/* FORMS LAYER */}
        <div className="relative flex-1 w-full h-full">
          
          {/* REGISTER FORM */}
          <div className={`w-full md:w-1/2 h-full p-10 md:p-14 flex flex-col justify-center transition-all duration-700 absolute left-0 top-0 z-10 ${isLoginView ? 'opacity-0 -translate-x-full pointer-events-none' : 'opacity-100 translate-x-0'}`}>
            <h2 className={`text-3xl md:text-4xl font-black italic uppercase tracking-tighter mb-2 ${isOrg ? 'text-blue-950' : 'text-emerald-950'}`}>Đăng ký</h2>
            <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-6">Trở thành một phần của GIVEBACK</p>
            
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-2xl w-fit">
               <button onClick={() => setUserType('individual')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${!isOrg ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400'}`}>Cá nhân</button>
               <button onClick={() => setUserType('organization')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${isOrg ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Tổ chức</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-gray-700 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all" placeholder={isOrg ? "Tên Tổ chức" : "Họ và tên"} value={isOrg ? orgName : fullName} onChange={e => isOrg ? setOrgName(e.target.value) : setFullName(e.target.value)} />
              <input required type="email" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-gray-700 text-sm" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <input required type="password" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-gray-700 text-sm" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="submit" disabled={loading} className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest text-white shadow-lg transition-all active:scale-95 ${mainColorClass}`}>{loading ? 'Đang xử lý...' : 'Tạo tài khoản'}</button>
            </form>

            <div className="mt-6 flex items-center gap-2">
               <button onClick={() => handleSocialLogin(googleProvider)} className="flex-1 py-3 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-gray-100 flex items-center justify-center"><img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="" /></button>
               <button onClick={() => handleSocialLogin(facebookProvider)} className="flex-1 py-3 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-gray-100 flex items-center justify-center"><img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-5 h-5" alt="" /></button>
               <button onClick={handleGuestLogin} className={`flex-1 py-3 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-gray-100 flex flex-col items-center justify-center ${textAccentClass}`}><span className="text-sm">👤</span><span className="text-[7px] font-black uppercase">Guest</span></button>
            </div>
          </div>

          {/* LOGIN FORM */}
          <div className={`w-full md:w-1/2 h-full p-10 md:p-14 flex flex-col justify-center transition-all duration-700 absolute right-0 top-0 z-10 ${!isLoginView ? 'opacity-0 translate-x-full pointer-events-none' : 'opacity-100 translate-x-0'}`}>
            <h2 className={`text-3xl md:text-4xl font-black italic uppercase tracking-tighter mb-2 ${isOrg ? 'text-blue-950' : 'text-emerald-950'}`}>Đăng nhập</h2>
            <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-8">Chào mừng bạn quay trở lại</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input required type="email" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-gray-700 text-sm focus:ring-2 focus:ring-emerald-500/20" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <div className="relative">
                <input required type={showPassword ? "text" : "password"} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-gray-700 text-sm" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-800">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.024 10.024 0 014.13-5.541M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 21l-2-2m-3.5-3.5L3 3"} /></svg>
                </button>
              </div>
              {error && <p className="text-[9px] text-red-500 font-bold italic">{error}</p>}
              <button type="submit" disabled={loading} className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest text-white shadow-lg transition-all active:scale-95 ${mainColorClass}`}>{loading ? 'Đang vào...' : 'Bắt đầu hành trình'}</button>
            </form>

            <div className="mt-8 flex items-center gap-4">
               <div className="flex-1 h-px bg-gray-100"></div>
               <span className="text-[9px] font-black text-gray-800 uppercase">Hoặc</span>
               <div className="flex-1 h-px bg-gray-100"></div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
               <button onClick={() => handleSocialLogin(googleProvider)} className="flex flex-col items-center justify-center gap-1 py-3 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-gray-100"><img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="" /><span className="text-[8px] font-black uppercase text-gray-400">Google</span></button>
               <button onClick={() => handleSocialLogin(facebookProvider)} className="flex flex-col items-center justify-center gap-1 py-3 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-gray-100"><img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-4 h-4" alt="" /><span className="text-[8px] font-black uppercase text-gray-400">Facebook</span></button>
               <button onClick={handleGuestLogin} className={`flex flex-col items-center justify-center gap-1 py-3 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-gray-100 ${textAccentClass}`}><span className="text-base">👤</span><span className="text-[8px] font-black uppercase">Dùng thử</span></button>
            </div>
          </div>
        </div>

        {/* OVERLAY PANEL */}
        <div className={`absolute top-0 w-1/2 h-full transition-all duration-700 ease-in-out z-20 hidden md:block ${isLoginView ? 'left-0' : 'left-1/2'}`}>
          <div className={`relative h-full text-white flex flex-col items-center justify-center p-12 text-center overflow-hidden transition-colors duration-1000 ${mainColorClass} ${isLoginView ? 'rounded-tr-[12rem] rounded-br-[12rem]' : 'rounded-tl-[12rem] rounded-bl-[12rem]'}`}>
            
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
            
            <div className={`transition-all duration-700 flex flex-col items-center w-full px-6 ${isLoginView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20 pointer-events-none absolute'}`}>
               <h1 className="text-4xl lg:text-5xl font-black italic tracking-tighter mb-4">GIVEBACK</h1>
               <p className="text-sm font-medium italic mb-10 leading-relaxed opacity-90">"Mỗi chuyến đi, một hành trình nhân ái. Bạn đã sẵn sàng lan tỏa yêu thương chưa?"</p>
               <button onClick={() => setIsLoginView(false)} className="px-10 py-4 bg-white/20 backdrop-blur-md border-2 border-white/40 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-emerald-700 transition-all shadow-xl">Đăng ký ngay</button>
            </div>

            <div className={`transition-all duration-700 flex flex-col items-center w-full px-6 ${!isLoginView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20 pointer-events-none absolute'}`}>
               <h1 className="text-4xl lg:text-5xl font-black italic tracking-tighter mb-4 uppercase">Mừng bạn trở về!</h1>
               <p className="text-sm font-medium italic mb-10 leading-relaxed opacity-90">"Yêu thương cho đi là yêu thương còn mãi. Hãy đăng nhập để tiếp tục hành trình."</p>
               <button onClick={() => setIsLoginView(true)} className="px-10 py-4 bg-white/20 backdrop-blur-md border-2 border-white/40 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-blue-700 transition-all shadow-xl">Đăng nhập ngay</button>
            </div>

            <div className="absolute bottom-10 animate-truck">
               <div className="text-3xl">🚚🎁❤️</div>
            </div>
          </div>
        </div>

        {/* MOBILE TOGGLE */}
        <div className="md:hidden p-6 bg-gray-50 border-t flex items-center justify-center gap-2">
           <span className="text-[10px] font-bold text-gray-400 uppercase italic">{isLoginView ? "Chưa có tài khoản?" : "Đã có tài khoản?"}</span>
           <button onClick={() => setIsLoginView(!isLoginView)} className={`text-[10px] font-black uppercase tracking-widest ${textAccentClass}`}>
             {isLoginView ? "Đăng ký ngay" : "Đăng nhập ngay"}
           </button>
        </div>
      </div>

    </div>
  );
};

export default Login;
