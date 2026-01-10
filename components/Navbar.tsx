
import React from 'react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  activeTab: 'home' | 'admin' | 'donate' | 'messages' | 'profile' | 'contact';
  setActiveTab: (tab: 'home' | 'admin' | 'donate' | 'messages' | 'profile' | 'contact') => void;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
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
          <span className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent italic tracking-tighter">GIVEBACK</span>
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <button 
            onClick={() => setActiveTab('home')}
            className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'home' ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'}`}
          >
            Trang chủ
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'admin' ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'}`}
          >
            Tin từ thiện
          </button>
          {user && (
            <>
              <button 
                onClick={() => setActiveTab('messages')}
                className={`text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'messages' ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'}`}
              >
                Tin nhắn
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'}`}
              >
                Hồ sơ
              </button>
            </>
          )}
          <button 
            onClick={() => setActiveTab('donate')}
            className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'donate' ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'}`}
          >
            Ủng hộ ship
          </button>
          <button 
            onClick={() => setActiveTab('contact')}
            className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'contact' ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'}`}
          >
            Liên hệ
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <div 
                className="text-right hidden sm:block cursor-pointer"
                onClick={() => setActiveTab('profile')}
              >
                <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">{user.name}</p>
                <p className="text-[10px] text-emerald-500 font-bold italic">{user.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</p>
              </div>
              <img 
                src={user.avatar} 
                className="w-8 h-8 rounded-full border-2 border-emerald-500 object-cover cursor-pointer" 
                onClick={() => setActiveTab('profile')}
                alt=""
              />
              <button 
                onClick={onLogout}
                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                title="Đăng xuất"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100">Tham gia</button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
