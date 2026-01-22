
  import React from 'react';
  import { User } from '../types';

  interface NavbarProps {
    user: User | null;
    activeTab: string;
    setActiveTab: (tab: any) => void;
    onLogout: () => void;
    pendingRequestsCount?: number;
    unreadMessagesCount?: number;
    isDarkMode?: boolean;
    toggleDarkMode?: () => void;
    toggleAI?: () => void;
  }

  const Navbar: React.FC<NavbarProps> = ({ 
    user, 
    activeTab, 
    setActiveTab, 
    onLogout, 
    pendingRequestsCount = 0,
    unreadMessagesCount = 0,
    isDarkMode,
    toggleDarkMode,
    toggleAI
  }) => {
    const getAvatar = (src?: string, name?: string) => {
      if (src && src.trim() !== "") return src;
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=10b981&color=fff&bold=true`;
    };

    const handleAIToggle = async () => {
      const win = window as any;
      if (win.aistudio && typeof win.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await win.aistudio.openSelectKey();
          // Sau khi chọn key, chúng ta vẫn mở panel AI lên
        }
      }
      if (toggleAI) toggleAI();
    };

    const isAdmin = user?.role === 'admin';

    return (
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-emerald-50 dark:border-emerald-900/30 h-16 flex items-center px-4 transition-colors duration-500 shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={() => setActiveTab('market')}
          >
            <div className="bg-[#10b981] dark:bg-emerald-500 p-1.5 rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-transform group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <span className="text-xl font-black text-emerald-950 dark:text-emerald-400 tracking-tighter uppercase ">GIVEBACK</span>
          </div>

          <div className="flex items-center space-x-1 md:space-x-2">
            {/* AI SPARKLE ENTRY POINT */}
            <button 
              onClick={handleAIToggle}
              className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all group relative animate-in fade-in"
              title="Trò chuyện với AI"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </button>

            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>

            {isAdmin && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`p-2 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400' : 'text-gray-400 hover:text-emerald-600'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04c0 4.833 1.95 9.213 5.118 12.428a11.954 11.954 0 001.31 1.306c.324.238.675.404 1.05.517.375.113.774.148 1.13.148.356 0 .755-.035 1.13-.148.375-.113.726-.279 1.05-.517 1.311-1.306 2.454-2.738 3.42-4.293a11.92 11.92 0 001.698-8.144z" /></svg>
              </button>
            )}

            <button 
              onClick={() => setActiveTab('messages')}
              className={`relative p-2 rounded-xl transition-all ${activeTab === 'messages' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400' : 'text-gray-400 hover:text-emerald-600'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              {unreadMessagesCount > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-600 text-white text-[7px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">{unreadMessagesCount}</span>}
            </button>

            <button 
              onClick={() => setActiveTab('notifications')}
              className={`relative p-2 rounded-xl transition-all ${activeTab === 'notifications' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400' : 'text-gray-400 hover:text-emerald-600'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {pendingRequestsCount > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-600 text-white text-[7px] font-black flex items-center justify-center rounded-full border-2 border-white">{pendingRequestsCount}</span>}
            </button>

            <div className="cursor-pointer ml-1 relative group" onClick={() => setActiveTab('profile')}>
              <img src={getAvatar(user?.avatar, user?.name)} className="w-9 h-9 rounded-xl border-2 border-emerald-100 dark:border-emerald-800 object-cover bg-gray-100 shadow-sm group-hover:scale-105 transition-transform" alt="Profile" />
            </div>

            <button onClick={() => { if (window.confirm("Đệ muốn đăng xuất?")) onLogout(); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors ml-1 hidden md:block" title="Đăng xuất">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    );
  };

  export default Navbar;
