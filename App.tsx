
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, ChatSession, FriendRequest } from './types';
import Navbar from './components/Navbar';
import AIHelper from './components/AIHelper';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Auction from './pages/Auction';
import Admin from './pages/Admin';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import MapSearch from './pages/MapSearch';
import Contact from './pages/Contact';
import Login from './pages/Login';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, onSnapshot, where } from "firebase/firestore";

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  sender?: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'market' | 'auction' | 'admin' | 'messages' | 'profile' | 'map' | 'contact' | 'notifications'>('home');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const addNotification = useCallback((type: NotificationType, message: string, sender?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message, sender }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    userRef.current = user;
    if (user) {
      const startTime = new Date().toISOString();
      
      // 1. Listen for messages
      const qChats = query(collection(db, "chats"), where("participants", "array-contains", user.id));
      const unsubChats = onSnapshot(qChats, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified" || change.type === "added") {
            const data = change.doc.data() as ChatSession;
            if (data.lastMessage && data.updatedAt > startTime && data.lastSenderId !== user.id) {
              const senderName = data.lastSenderId === data.donorId ? data.donorName : data.receiverName;
              addNotification('info', data.lastMessage, senderName);
            }
          }
        });
      });

      // 2. Listen for friend requests (Global count & Flash Notification)
      const qRequests = query(collection(db, "friend_requests"), where("toId", "==", user.id), where("status", "==", "pending"));
      const unsubRequests = onSnapshot(qRequests, (snapshot) => {
        setPendingRequestsCount(snapshot.size);

        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const req = change.doc.data() as FriendRequest;
            if (req.createdAt > startTime) {
              addNotification('success', `${req.fromName} muốn kết nối đồng đội với Đệ!`, 'Bạn bè');
            }
          }
        });
      });

      return () => {
        unsubChats();
        unsubRequests();
      };
    }
  }, [user, addNotification]);

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
              role: (firebaseUser.email === 'admin@giveback.vn' || firebaseUser.email?.includes('de2104')) ? 'admin' : 'user',
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
      addNotification('success', `Chào mừng ${userData.name} đã gia nhập gia đình GIVEBACK!`, 'Hệ thống');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setActiveTab('home');
    setViewingUserId(null);
    setPendingRequestsCount(0);
    addNotification('info', 'Bạn đã đăng xuất an toàn. Hẹn sớm gặp lại!', 'Hệ thống');
  };

  const handleViewProfile = (userId: string) => {
    setViewingUserId(userId);
    setActiveTab('profile');
  };

  const handleGoToMessages = (partnerId?: string) => {
    setActiveTab('messages');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-emerald-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-600"></div></div>;
  if (!user) return <Login onLogin={handleLoginSuccess} />;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'profile') setViewingUserId(null);
        }} 
        onLogout={handleLogout} 
        pendingRequestsCount={pendingRequestsCount}
      />
      <main>
        {activeTab === 'home' && <Home user={user} onNotify={addNotification} onViewProfile={handleViewProfile} />}
        {activeTab === 'market' && <Marketplace user={user} setActiveTab={setActiveTab} onNotify={addNotification} />}
        {activeTab === 'auction' && <Auction user={user} setActiveTab={setActiveTab} onNotify={addNotification} />}
        {activeTab === 'map' && <MapSearch />}
        {activeTab === 'admin' && <Admin user={user} onNotify={addNotification} />}
        {activeTab === 'messages' && <Messages user={user} />}
        {activeTab === 'notifications' && <Notifications user={user} onNotify={addNotification} onUpdateUser={setUser} onViewProfile={handleViewProfile} />}
        {activeTab === 'profile' && (
          <Profile 
            user={user} 
            viewingUserId={viewingUserId} 
            onUpdateUser={(updated) => setUser(updated)} 
            onNotify={addNotification} 
            onGoToMessages={handleGoToMessages}
          />
        )}
        {activeTab === 'contact' && <Contact />}
      </main>

      {/* Modern Notification Portal */}
      <div className="fixed top-24 right-6 z-[200] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
        {notifications.map((n) => (
          <div 
            key={n.id} 
            className={`pointer-events-auto relative overflow-hidden bg-white/90 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 animate-in slide-in-from-right duration-500 flex items-start gap-4`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
              n.type === 'error' ? 'bg-red-100 text-red-600' : 
              n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {n.type === 'success' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              {n.type === 'error' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
              {n.type === 'warning' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
              {n.type === 'info' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
            </div>
            <div className="flex-1">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                n.type === 'success' ? 'text-emerald-600' : 
                n.type === 'error' ? 'text-red-600' : 
                n.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
              }`}>{n.sender || (n.type === 'success' ? 'Thành công' : n.type === 'error' ? 'Lỗi hệ thống' : 'Thông báo')}</p>
              <p className="text-sm font-bold text-gray-800 italic leading-snug">"{n.message}"</p>
            </div>
            {/* Progress Bar */}
            <div className={`absolute bottom-0 left-0 h-1 transition-all duration-[5000ms] ease-linear w-full ${
              n.type === 'success' ? 'bg-emerald-500' : 
              n.type === 'error' ? 'bg-red-500' : 
              n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            }`} style={{ animation: 'progress 5s linear forwards' }}></div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <AIHelper />
    </div>
  );
};

export default App;
