
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 h-16 flex items-center px-4">
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => setActiveTab('home')}
        >
          <div className="bg-[#045d43] p-1.5 rounded-lg">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
               <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <span className="text-xl font-black text-[#045d43] tracking-tighter">GIVEBACK</span>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setActiveTab('notifications')}
            className="relative text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <div 
            className="cursor-pointer"
            onClick={() => setActiveTab('profile')}
          >
            <img 
              src={getAvatar(user?.avatar, user?.name)} 
              className="w-8 h-8 rounded-full border border-gray-100 object-cover bg-gray-100" 
              alt="Profile"
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
