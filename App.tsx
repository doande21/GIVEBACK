
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
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './services/firebase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isAiOpen, setIsAiOpen] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

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
    setIsAiOpen(false);
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

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Home user={user} onNotify={handleNotify} onViewProfile={handleViewProfile} setActiveTab={setActiveTab} />;
      case 'market': return <Marketplace user={user} onNotify={handleNotify} setActiveTab={setActiveTab} onViewProfile={handleViewProfile} />;
      case 'sponsors': return <Sponsors />;
      case 'auction': return <Auction user={user} onNotify={handleNotify} setActiveTab={setActiveTab} />;
      case 'map': return <MapSearch />;
      case 'contact': return <Contact />;
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
      case 'messages': return <Messages user={user} onViewProfile={handleViewProfile} />;
      case 'notifications': return (
        <Notifications user={user} onNotify={handleNotify} onUpdateUser={(u) => setUser(u)} onViewProfile={handleViewProfile} />
      );
      case 'missions': return <Missions setActiveTab={setActiveTab} />;
      default: return <Home user={user} onNotify={handleNotify} onViewProfile={handleViewProfile} setActiveTab={setActiveTab} />;
    }
  };

  const navItems = [
    { 
      id: 'home', 
      label: 'BẢN TIN', 
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> 
    },
    { 
      id: 'market', 
      label: 'TẶNG ĐỒ', 
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.89 1.35 12 2.5 11.11 1.35C10.5 0.5 9.75 0 9 0 7.34 0 6 1.34 6 3c0 0.35 0.07 0.69 0.18 1H4c-1.11 0-2 0.89-2 2v13c0 1.11 0.89 2 2 2h16c1.11 0 2-0.89 2-2V6c0-1.11-0.89-2-2-2h-2.18c0.11-0.31 0.18-0.65 0.18-1 0-1.66-1.34-3-3-3-0.75 0-1.5 0.5-2.11 1.35ZM9 2c0.55 0 1 0.45 1 1s-0.45 1-1 1-1-0.45-1-1 0.45-1 1-1ZM15 2c0.55 0 1 0.45 1 1s-0.45 1-1 1-1-0.45-1-1 0.45-1 1-1ZM4 6h16v2H4V6ZM4 19V10h16v9H4Z"/></svg> 
    },
    { 
      id: 'sponsors', 
      label: 'TRI ÂN', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0 -.363 1.118l1.518 4.674c.3.922-1.755 1.688-2.503 1.118l-3.976-2.888a1 1 0 0 0 -1.175 0l-3.976 2.888c-.788.57-2.803-.196-2.503-1.118l1.518-4.674a1 1 0 0 0 -.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674z" /></svg> 
    },
    { 
      id: 'auction', 
      label: 'ĐẤU GIÁ', 
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M14.7 6.4L13.6 5.3c-.4-.4-1-.4-1.4 0L2.5 15c-.4.4-.4 1 0 1.4l1.1 1.1c.4.4 1 .4 1.4 0L14.7 7.8c.4-.4.4-1 0-1.4z M16.5 10.3l1.8-1.8c.4-.4.4-1 0-1.4l-3.2-3.2c-.4-.4-1-.4-1.4 0l-1.8 1.8 4.6 4.6z"/></svg> 
    },
    { 
      id: 'map', 
      label: 'BẢN ĐỒ', 
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg> 
    },
    { 
      id: 'contact', 
      label: 'LIÊN HỆ', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> 
    }
  ];

  return (
    <div className="min-h-screen transition-colors duration-300 overflow-x-hidden">
      <Navbar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        pendingRequestsCount={pendingRequestsCount}
        unreadMessagesCount={unreadMessagesCount}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        toggleAI={() => setIsAiOpen(!isAiOpen)}
      />
      
      <main className="pb-24">{renderContent()}</main>
      
      <AIHelper isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-100 dark:border-slate-800 flex items-center justify-around h-20 px-2 pb-1 overflow-x-auto scrollbar-hide shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
         {navItems.map(item => (
           <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex flex-col items-center justify-center space-y-1.5 transition-all flex-1 min-w-[60px] h-full"
           >
             <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-[#045d43] text-white shadow-lg scale-105' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'}`}>
               {item.icon}
             </div>
             <span className={`text-[8px] font-black uppercase tracking-tight transition-colors ${activeTab === item.id ? 'text-[#045d43] dark:text-emerald-400' : 'text-gray-400'}`}>
               {item.label}
             </span>
           </button>
         ))}
      </div>
    </div>
  );
};

export default App;
