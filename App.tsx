
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Auction from './pages/Auction';
import Sponsors from './pages/Sponsors';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import MapSearch from './pages/MapSearch';
import Contact from './pages/Contact';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import AIHelper from './components/AIHelper';
import { User, ChatSession } from './types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './services/firebase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const qChats = query(collection(db, "chats"), where("participants", "array-contains", user.id));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const sessions = snapshot.docs.map(d => d.data() as ChatSession);
      const unread = sessions.filter(s => 
        s.lastSenderId !== user.id && 
        (!s.readBy || !s.readBy.includes(user.id))
      ).length;
      setUnreadMessagesCount(unread);
    });
    const qReqs = query(collection(db, "friend_requests"), where("toId", "==", user.id), where("status", "==", "pending"));
    const unsubReqs = onSnapshot(qReqs, (snapshot) => {
      setPendingRequestsCount(snapshot.size);
    });
    return () => { unsubChats(); unsubReqs(); };
  }, [user?.id]);

  const handleLogin = (role: 'user' | 'admin', userData?: User) => {
    if (userData) {
      setUser(userData);
      setActiveTab('home');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('home');
    setViewingUserId(null);
  };

  const handleViewProfile = (userId: string) => {
    if (user && userId === user.id) {
      setViewingUserId(null);
    } else {
      setViewingUserId(userId);
    }
    setActiveTab('profile');
  };

  // Hàm xử lý thông báo dùng chung, nhận đúng tham số như interface yêu cầu
  const handleNotify = (type: string, message: string, sender?: string) => {
    console.log(`[${type.toUpperCase()}] from ${sender || 'System'}: ${message}`);
  };

  const handleSetTabFromNavbar = (tab: string) => {
    if (tab === 'profile') {
      setViewingUserId(null);
    }
    setActiveTab(tab);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Home user={user} onNotify={handleNotify} onViewProfile={handleViewProfile} />;
      case 'market': return <Marketplace user={user} onNotify={handleNotify} setActiveTab={setActiveTab} onViewProfile={handleViewProfile} />;
      case 'auction': return <Auction user={user} onNotify={handleNotify} setActiveTab={setActiveTab} />;
      case 'sponsors': return <Sponsors />;
      case 'admin': return <Admin user={user} onNotify={handleNotify} />;
      case 'profile': return (
        <Profile 
          user={user} 
          viewingUserId={viewingUserId} 
          onUpdateUser={(u) => setUser(u)} 
          onNotify={handleNotify} 
          onGoToMessages={(partnerId) => setActiveTab('messages')}
          onViewProfile={handleViewProfile}
        />
      );
      case 'map': return <MapSearch />;
      case 'contact': return <Contact />;
      case 'messages': return <Messages user={user} onViewProfile={handleViewProfile} />;
      case 'notifications': return (
        <Notifications user={user} onNotify={handleNotify} onUpdateUser={(u) => setUser(u)} onViewProfile={handleViewProfile} />
      );
      default: return <Home user={user} onNotify={handleNotify} onViewProfile={handleViewProfile} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={handleSetTabFromNavbar} 
        onLogout={handleLogout} 
        pendingRequestsCount={pendingRequestsCount}
        unreadMessagesCount={unreadMessagesCount}
      />
      <main className="transition-all duration-500">{renderContent()}</main>
      <AIHelper />
      <footer className="bg-white border-t border-gray-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-2xl font-black italic tracking-tighter text-emerald-950 mb-2">GIVEBACK</p>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest italic">Firebase Cloud Architecture & Real-time Connectivity</p>
          <p className="text-gray-300 text-[8px] mt-4 uppercase font-bold">© 2025 de2104 - de21042005</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
