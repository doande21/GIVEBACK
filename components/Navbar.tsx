
  import React from 'react';
  import { User } from '../types';

  interface NavbarProps {
    user: User | null;
    activeTab: string;
    setActiveTab: (tab: any) => void;
    onLogout: () => void;
    onConfirm?: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info') => void;
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
    onConfirm,
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
        }
      }
      if (toggleAI) toggleAI();
    };

    const isAdmin = user?.role === 'admin';

    const navLinks = [
      { id: 'market', label: 'Sàn đồ' },
      { id: 'home', label: 'Bản tin' },
      { id: 'auction', label: 'Đấu giá' },
      { id: 'sponsors', label: 'Tri ân' },
      { id: 'map', label: 'Bản đồ' },
      { id: 'contact', label: 'Liên hệ' },
    ];

    return (
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0d1117]/90 backdrop-blur-xl border-b border-gray-800/50 h-16 flex items-center px-4 transition-colors duration-300">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => setActiveTab('market')}
          >
            <div className="bg-emerald-600 p-1.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-110 group-hover:rotate-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <span className="text-xl font-black text-white tracking-tighter">GIVEBACK</span>
            <span className="hidden sm:inline-block bg-emerald-500/20 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">BETA</span>
          </div>

          {/* Center Nav Links - Desktop */}
          <div className="hidden md:flex items-center space-x-1 bg-gray-800/40 rounded-2xl p-1">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === link.id 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-1.5">
            {/* Showcase */}
            <button 
              onClick={() => setActiveTab('showcase')}
              className={`p-2 rounded-xl transition-all ${activeTab === 'showcase' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500 hover:text-amber-400 hover:bg-gray-800'}`}
              title="Showcase Dự án"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0 -.363 1.118l1.518 4.674c.3.922-1.755 1.688-2.503 1.118l-3.976-2.888a1 1 0 0 0 -1.175 0l-3.976 2.888c-.788.57-2.803-.196-2.503-1.118l1.518-4.674a1 1 0 0 0 -.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674z" />
              </svg>
            </button>

            {/* AI Toggle */}
            <button 
              onClick={handleAIToggle}
              className="p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/20 transition-all relative"
              title="Trò chuyện với AI"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>

            {isAdmin && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`p-2 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-emerald-400 hover:bg-gray-800'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04c0 4.833 1.95 9.213 5.118 12.428a11.954 11.954 0 001.31 1.306c.324.238.675.404 1.05.517.375.113.774.148 1.13.148.356 0 .755-.035 1.13-.148.375-.113.726-.279 1.05-.517 1.311-1.306 2.454-2.738 3.42-4.293a11.92 11.92 0 001.698-8.144z" /></svg>
              </button>
            )}

            {/* Messages */}
            <button 
              onClick={() => setActiveTab('messages')}
              className={`relative p-2 rounded-xl transition-all ${activeTab === 'messages' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-emerald-400 hover:bg-gray-800'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              {unreadMessagesCount > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[7px] font-bold flex items-center justify-center rounded-full border-2 border-[#0d1117] animate-bounce">{unreadMessagesCount}</span>}
            </button>

            {/* Notifications */}
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`relative p-2 rounded-xl transition-all ${activeTab === 'notifications' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-emerald-400 hover:bg-gray-800'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {pendingRequestsCount > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[7px] font-bold flex items-center justify-center rounded-full border-2 border-[#0d1117]">{pendingRequestsCount}</span>}
            </button>

            {/* Profile */}
            <div className="cursor-pointer ml-1 relative group" onClick={() => setActiveTab('profile')}>
              <img src={getAvatar(user?.avatar, user?.name)} className="w-8 h-8 rounded-xl border-2 border-emerald-700/50 object-cover bg-gray-800 group-hover:scale-110 group-hover:border-emerald-500 transition-all" alt="Profile" />
            </div>

            {/* Logout */}
            <button onClick={() => { 
              if (onConfirm) {
                onConfirm("Đăng xuất", "bạn muốn đăng xuất khỏi hệ thống?", onLogout, 'danger');
              } else if (window.confirm("bạn muốn đăng xuất?")) {
                onLogout();
              }
            }} className="p-2 text-gray-600 hover:text-red-400 transition-colors ml-0.5 hidden md:block" title="Đăng xuất">
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
