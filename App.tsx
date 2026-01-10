
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatSession } from './types';
import Navbar from './components/Navbar';
import AIHelper from './components/AIHelper';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Login from './pages/Login';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, onSnapshot, where } from "firebase/firestore";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'admin' | 'donate' | 'messages' | 'profile' | 'contact'>('home');
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  
  const [toast, setToast] = useState<{message: string, sender: string} | null>(null);

  useEffect(() => {
    userRef.current = user;
    
    if (user) {
      const startTime = new Date().toISOString();
      
      const q = query(
        collection(db, "chats"), 
        where("participants", "array-contains", user.id)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified" || change.type === "added") {
            const data = change.doc.data() as ChatSession;
            if (data.lastMessage && data.updatedAt > startTime && data.lastSenderId !== user.id) {
              const senderName = data.lastSenderId === data.donorId ? data.donorName : data.receiverName;
              setToast({ sender: senderName, message: data.lastMessage });
              try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
                audio.volume = 0.4;
                audio.play();
              } catch (e) {}
              setTimeout(() => setToast(null), 6000);
            }
          }
        });
      }, (err) => console.error("Firebase Snapshot Error:", err));

      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ ...userDoc.data(), id: firebaseUser.uid } as User);
          } else {
            const tempUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Thành viên',
              email: firebaseUser.email || '',
              role: (firebaseUser.email === 'admin@giveback.vn' || firebaseUser.email === 'de2104') ? 'admin' : 'user',
              avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.email}&background=random`
            };
            setUser(tempUser);
          }
        } catch (e) { console.error(e); }
      } else {
        if (!userRef.current || userRef.current.id !== 'admin-manual') {
          setUser(null);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setActiveTab('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(role, data) => data && setUser(data)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <main>
        {activeTab === 'home' && <Home user={user} />}
        {activeTab === 'admin' && <Admin user={user} />}
        {activeTab === 'messages' && <Messages user={user} />}
        {activeTab === 'profile' && <Profile user={user} onUpdateUser={(updated) => setUser(updated)} />}
        {activeTab === 'donate' && (
          <div className="pt-24 px-4 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-lg">
              <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                 </svg>
              </div>
              <h1 className="text-3xl font-black mb-4 italic text-emerald-900 tracking-tighter uppercase">Hành Trình Gửi Trao</h1>
              <p className="text-gray-600 mb-8 italic underline decoration-emerald-200 decoration-4 uppercase text-xs font-black tracking-widest">Mỗi lượt ủng hộ giúp quà đi xa hơn.</p>
              <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-emerald-50 flex flex-col items-center">
                <p className="font-black text-gray-800 mb-6 uppercase text-xs tracking-widest">Quét mã ủng hộ vận chuyển</p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=GIVEBACK-CHARITY-FEE" alt="Donate QR" className="rounded-[2.5rem] shadow-2xl mb-8 border-8 border-emerald-50" />
                <p className="text-[10px] text-gray-400 italic font-bold uppercase tracking-widest">Nội dung: UNG HO VAN CHUYEN [SĐT]</p>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'contact' && (
          <div className="pt-24 px-4 max-w-7xl mx-auto pb-20">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-black text-emerald-900 italic tracking-tighter uppercase mb-4">Kết nối với Admin</h1>
              <p className="text-emerald-600 font-black text-xs uppercase tracking-[0.4em] italic underline decoration-emerald-200 decoration-4">Đệ luôn sẵn lòng lắng nghe và hỗ trợ bạn 24/7</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Phone Card */}
              <a href="tel:0333297621" className="group bg-white p-10 rounded-[3rem] shadow-xl border border-emerald-50 text-center hover:-translate-y-2 transition-all duration-300">
                <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase italic mb-2 tracking-tight">Gọi trực tiếp</h3>
                <p className="text-2xl font-black text-emerald-600">0333 297 621</p>
                <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-bold">Bấm để gọi ngay</p>
              </a>

              {/* Zalo Card */}
              <a href="https://zalo.me/0333297621" target="_blank" rel="noopener noreferrer" className="group bg-white p-10 rounded-[3rem] shadow-xl border border-emerald-50 text-center hover:-translate-y-2 transition-all duration-300">
                <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors font-black text-2xl italic">
                  Zalo
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase italic mb-2 tracking-tight">Chat qua Zalo</h3>
                <p className="text-lg font-bold text-gray-600 italic leading-relaxed">Kết nối nhanh chóng và gửi hình ảnh dễ dàng.</p>
                <p className="text-[10px] text-blue-500 mt-4 uppercase tracking-widest font-bold">Mở Zalo ngay</p>
              </a>

              {/* Facebook Card */}
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="group bg-white p-10 rounded-[3rem] shadow-xl border border-emerald-50 text-center hover:-translate-y-2 transition-all duration-300">
                <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase italic mb-2 tracking-tight">Facebook</h3>
                <p className="text-lg font-bold text-gray-600 italic leading-relaxed">Theo dõi các hoạt động mới nhất của GIVEBACK.</p>
                <p className="text-[10px] text-indigo-500 mt-4 uppercase tracking-widest font-bold">Truy cập Fanpage</p>
              </a>
            </div>

            <div className="mt-20 bg-emerald-900 rounded-[4rem] p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="max-w-xl text-center md:text-left">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Bạn có ý tưởng mới?</h2>
                  <p className="text-emerald-100 text-lg italic opacity-80">Đừng ngần ngại chia sẻ với Admin. Mọi đóng góp về tính năng hay ý tưởng thiện nguyện đều được trân trọng tuyệt đối.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/20 text-center min-w-[250px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300 mb-2">Email hỗ trợ</p>
                  <p className="text-xl font-black tracking-tight">doandeqn123@gmail.com </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div 
          onClick={() => setActiveTab('messages')}
          className="fixed top-20 right-6 z-[100] bg-white border-l-8 border-emerald-600 p-5 rounded-2xl shadow-2xl flex items-center space-x-4 animate-in slide-in-from-right duration-500 cursor-pointer hover:scale-105 transition-transform group"
        >
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tin nhắn mới!</p>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            </div>
            <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">{toast.sender}</p>
            <p className="text-[10px] text-gray-500 italic mt-0.5 line-clamp-1">"{toast.message}"</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setToast(null); }} className="text-gray-300 hover:text-gray-500 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <AIHelper />

      <footer className="bg-white border-t mt-20 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-gray-400 text-sm font-medium">
          <div className="flex items-center space-x-2">
            <span className="font-black text-emerald-600 uppercase italic tracking-tighter">GIVEBACK</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">&copy; 2026. Kết nối yêu thương.</span>
          </div>
          <div className="flex space-x-6 text-[10px] font-black uppercase tracking-widest">
            <a href="#" className="hover:text-emerald-600">Điều khoản</a>
            <a href="#" className="hover:text-emerald-600">Bảo mật</a>
            <a href="#" className="hover:text-emerald-600">Liên hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
