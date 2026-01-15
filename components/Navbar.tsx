
import React from 'react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onLogout: () => void;
  pendingRequestsCount?: number;
  unreadMessagesCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  pendingRequestsCount = 0,
  unreadMessagesCount = 0
}) => {
  const getAvatar = (src?: string, name?: string) => {
    if (src && src.trim() !== "") return src;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=059669&color=fff&bold=true`;
  };

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-effect border-b">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => setActiveTab('home')}
        >
          <div className="bg-emerald-600 p-2 rounded-lg shadow-lg shadow-emerald-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent tracking-tighter hidden md:block">GIVEBACK</span>
        </div>

        <div className="flex items-center space-x-1 md:space-x-2">
          {['home', 'market', 'sponsors', 'auction', 'map', 'contact'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all ${
                activeTab === tab 
                ? (tab === 'sponsors' || tab === 'auction' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50') 
                : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50/50'
              }`}
            >
              {tab === 'home' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'home' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
              {tab === 'market' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'market' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
              {tab === 'sponsors' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill={activeTab === 'sponsors' ? 'currentColor' : 'none'} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
              {tab === 'auction' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'auction' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2" /></svg>}
              {tab === 'map' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'map' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
              {tab === 'contact' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'contact' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
              <span className="text-[6px] font-black uppercase tracking-tighter mt-1 hidden sm:block">
                {tab === 'home' && 'Bảng tin'}
                {tab === 'market' && 'Tặng đồ'}
                {tab === 'sponsors' && 'Tri ân'}
                {tab === 'auction' && 'Đấu giá'}
                {tab === 'map' && 'Bản đồ'}
                {tab === 'contact' && 'Liên hệ'}
              </span>
            </button>
          ))}

          {isAdmin && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all ${activeTab === 'admin' ? 'text-emerald-600 bg-emerald-100 shadow-inner' : 'text-emerald-600/60 hover:text-emerald-600 hover:bg-emerald-50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[6px] font-black uppercase tracking-tighter mt-1 hidden sm:block">Quản trị</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {user ? (
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all relative ${activeTab === 'notifications' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'notifications' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setActiveTab('messages')}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all relative ${activeTab === 'messages' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500 hover:bg-emerald-200 hover:text-emerald-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>

              <div 
                className={`flex items-center space-x-2 cursor-pointer p-1 pr-3 rounded-full hover:bg-gray-100 transition-all border border-transparent ${activeTab === 'profile' ? 'bg-emerald-50 border-emerald-200' : 'hover:border-gray-200'} relative`}
                onClick={() => setActiveTab('profile')}
              >
                <img 
                  src={getAvatar(user.avatar, user.name)} 
                  className="w-8 h-8 rounded-full border border-emerald-500 object-cover bg-white" 
                  alt=""
                />
                <span className="text-[10px] font-black uppercase text-emerald-900 ml-1 hidden lg:block tracking-tighter">{user.name.split(' ').pop()}</span>
              </div>

              <button 
                onClick={onLogout}
                className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Tham gia</button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
