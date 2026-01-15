
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

  const handleNotify = (type: string, message: string, sender?: string) => {
    console.log(`[${type.toUpperCase()}] from ${sender || 'System'}: ${message}`);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Home user={user} onNotify={handleNotify} onViewProfile={handleViewProfile} setActiveTab={setActiveTab} />;
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
      default: return <Home user={user} onNotify={handleNotify} onViewProfile={handleViewProfile} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        pendingRequestsCount={pendingRequestsCount}
        unreadMessagesCount={unreadMessagesCount}
      />
      
      <main className="transition-all duration-500">{renderContent()}</main>
      
      <AIHelper />

      {/* Bottom Navigation chuẩn Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex items-center justify-around h-20 px-2 pb-2">
         {[
           { id: 'home', label: 'Trang chủ', icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg> },
           { id: 'map', label: 'Khám phá', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
           { id: 'plus', label: '', icon: <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></div> },
           { id: 'auction', label: 'Chiến dịch', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
           { id: 'profile', label: 'Cá nhân', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> }
         ].map(item => (
           <button 
            key={item.id}
            onClick={() => {
              if (item.id === 'plus') setActiveTab('market');
              else setActiveTab(item.id);
            }}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors ${activeTab === item.id ? 'text-emerald-700' : 'text-gray-300'}`}
           >
             {item.icon}
             {item.label && <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>}
           </button>
         ))}
      </div>
    </div>
  );
};

export default App;
