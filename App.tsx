
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
import Missions from './pages/Missions';
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
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Effect quản lý Dark Mode đồng bộ với Tailwind
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

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
    if (user && userId === user.id) setViewingUserId(null);
    else setViewingUserId(userId);
    setActiveTab('profile');
  };

  const handleNotify = (type: string, message: string, sender?: string) => {
    console.log(`[${type.toUpperCase()}] from ${sender || 'System'}: ${message}`);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const isAdmin = user.role === 'admin';

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Home user={user} onNotify={handleNotify} onViewProfile={handleViewProfile} setActiveTab={setActiveTab} />;
      case 'market': return <Marketplace user={user} onNotify={handleNotify} setActiveTab={setActiveTab} onViewProfile={handleViewProfile} />;
      case 'auction': return <Auction user={user} onNotify={handleNotify} setActiveTab={setActiveTab} />;
      case 'missions': return <Missions setActiveTab={setActiveTab} />;
      case 'sponsors': return <Sponsors />;
      case 'admin': return <Admin user={user} onNotify={handleNotify} />;
      case 'profile': return (
        <Profile 
          user={user} 
          viewingUserId={viewingUserId} 
          onUpdateUser={(u) => setUser(u)} 
          onNotify={handleNotify} 
          onGoToMessages={() => setActiveTab('messages')}
          onViewProfile={handleViewProfile}
          onLogout={handleLogout}
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

  const navItems = [
    { id: 'home', label: 'TRANG CHỦ', icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg> },
    { id: 'map', label: 'KHÁM PHÁ', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { id: 'plus', label: '', icon: <div className="bg-white dark:bg-emerald-500 text-[#045d43] dark:text-white p-3 rounded-full shadow-lg"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></div> },
    { id: isAdmin ? 'admin' : 'missions', label: isAdmin ? 'QUẢN TRỊ' : 'CHIẾN DỊCH', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
    { id: 'profile', label: 'CÁ NHÂN', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> }
  ];

  return (
    <div className="min-h-screen transition-colors duration-300">
      <Navbar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        pendingRequestsCount={pendingRequestsCount}
        unreadMessagesCount={unreadMessagesCount}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
      
      <main className="pb-24">{renderContent()}</main>
      
      <AIHelper />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#045d43] dark:bg-slate-900 border-t border-white/10 flex items-center justify-around h-20 px-2 pb-2">
         {navItems.map(item => (
           <button 
            key={item.id}
            onClick={() => {
              if (item.id === 'plus') setActiveTab('market');
              else setActiveTab(item.id);
            }}
            className={`flex flex-col items-center justify-center space-y-1 transition-all flex-1 h-full ${activeTab === item.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
           >
             <div className={`${activeTab === item.id && item.id !== 'plus' ? 'scale-110' : ''} transition-transform`}>
               {item.icon}
             </div>
             {item.label && <span className={`text-[8px] font-black uppercase tracking-widest ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>}
             {activeTab === item.id && item.id !== 'plus' && <div className="w-1 h-1 bg-white rounded-full mt-0.5"></div>}
           </button>
         ))}
      </div>
    </div>
  );
};

export default App;
