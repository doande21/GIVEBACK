
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatSession } from './types';
import Navbar from './components/Navbar';
import AIHelper from './components/AIHelper';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Auction from './pages/Auction';
import Admin from './pages/Admin';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import MapSearch from './pages/MapSearch';
import Contact from './pages/Contact';
import Login from './pages/Login';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, onSnapshot, where } from "firebase/firestore";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'market' | 'auction' | 'admin' | 'messages' | 'profile' | 'map' | 'contact'>('home');
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const [toast, setToast] = useState<{message: string, sender: string} | null>(null);

  useEffect(() => {
    userRef.current = user;
    if (user) {
      const startTime = new Date().toISOString();
      const q = query(collection(db, "chats"), where("participants", "array-contains", user.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified" || change.type === "added") {
            const data = change.doc.data() as ChatSession;
            if (data.lastMessage && data.updatedAt > startTime && data.lastSenderId !== user.id) {
              const senderName = data.lastSenderId === data.donorId ? data.donorName : data.receiverName;
              setToast({ sender: senderName, message: data.lastMessage });
              setTimeout(() => setToast(null), 6000);
            }
          }
        });
      });
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
        if (!userRef.current || userRef.current.id !== 'admin-manual') setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (role: 'user' | 'admin', userData?: User) => {
    if (userData) {
      setUser(userData);
      setToast({ sender: "Hệ thống GIVEBACK", message: `Chào mừng ${userData.name} đã tham gia cộng đồng!` });
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setActiveTab('home');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-emerald-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-600"></div></div>;
  if (!user) return <Login onLogin={handleLoginSuccess} />;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <main>
        {activeTab === 'home' && <Home user={user} />}
        {activeTab === 'market' && <Marketplace user={user} setActiveTab={setActiveTab} />}
        {activeTab === 'auction' && <Auction user={user} setActiveTab={setActiveTab} />}
        {activeTab === 'map' && <MapSearch />}
        {activeTab === 'admin' && <Admin user={user} />}
        {activeTab === 'messages' && <Messages user={user} />}
        {activeTab === 'profile' && <Profile user={user} onUpdateUser={(updated) => setUser(updated)} />}
        {activeTab === 'contact' && <Contact />}
      </main>
      {toast && <div className="fixed top-20 right-6 z-[130] bg-white border-l-8 border-emerald-600 p-5 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-500 max-w-xs">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{toast.sender} nhắn:</p>
          <p className="text-sm font-bold text-gray-800 line-clamp-2 italic">"{toast.message}"</p>
      </div>}
      <AIHelper />
    </div>
  );
};

export default App;
