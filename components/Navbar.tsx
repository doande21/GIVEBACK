
import React from 'react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onLogout: () => void;
  unreadCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ user, activeTab, setActiveTab, onLogout, unreadCount = 0 }) => {
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
          <span className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent italic tracking-tighter hidden md:block">GIVEBACK</span>
        </div>

        <div className="flex items-center space-x-1 md:space-x-2">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all ${activeTab === 'home' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50/50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'home' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[6px] font-black uppercase tracking-tighter mt-1 hidden sm:block">Bảng tin</span>
          </button>

          <button 
            onClick={() => setActiveTab('market')}
            className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all ${activeTab === 'market' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50/50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'market' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-[6px] font-black uppercase tracking-tighter mt-1 hidden sm:block">Tặng đồ</span>
          </button>

          <button 
            onClick={() => setActiveTab('auction')}
            className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all ${activeTab === 'auction' ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50/50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'auction' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2" />
            </svg>
            <span className="text-[6px] font-black uppercase tracking-tighter mt-1 hidden sm:block">Đấu giá</span>
          </button>

          <button 
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all ${activeTab === 'map' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50/50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'map' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-[6px] font-black uppercase tracking-tighter mt-1 hidden sm:block">Bản đồ</span>
          </button>

          <button 
            onClick={() => setActiveTab('contact')}
            className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all ${activeTab === 'contact' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50/50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'contact' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-[6px] font-black uppercase tracking-tighter mt-1 hidden sm:block">Liên hệ</span>
          </button>

          {user?.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all ${activeTab === 'admin' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50/50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === 'admin' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className="text-[6px] font-black uppercase tracking-tighter mt-1 hidden sm:block">Quản trị</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {user ? (
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setActiveTab('messages')}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all relative ${activeTab === 'messages' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div 
                className="flex items-center space-x-2 cursor-pointer p-1 pr-3 rounded-full hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
                onClick={() => setActiveTab('profile')}
              >
                <img 
                  src={user.avatar} 
                  className="w-8 h-8 rounded-full border border-emerald-500 object-cover" 
                  alt=""
                />
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
