
import React, { useState, useEffect } from 'react';
import { User, SocialPost, CharityMission } from '../types';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  limit
} from "firebase/firestore";
import { db } from '../services/firebase';

interface HomeProps {
  user: User;
  onNotify: (type: any, message: string, sender?: string) => void;
  onViewProfile: (userId: string) => void;
  setActiveTab: (tab: string) => void;
}

const Home: React.FC<HomeProps> = ({ user, onNotify, onViewProfile, setActiveTab }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [missions, setMissions] = useState<CharityMission[]>([]);

  useEffect(() => {
    const unsubPosts = onSnapshot(query(collection(db, "social_posts"), orderBy("createdAt", "desc")), (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPost)));
    });
    const unsubMissions = onSnapshot(query(collection(db, "missions"), orderBy("createdAt", "desc"), limit(1)), (snap) => {
      setMissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });
    return () => { unsubPosts(); unsubMissions(); };
  }, []);

  const navItems = [
    { id: 'home', label: 'BẢN TIN', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg> },
    { id: 'market', label: 'TẶNG ĐỒ', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
    { id: 'sponsors', label: 'TRI ÂN', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
    { id: 'auction', label: 'ĐẤU GIÁ', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2" /></svg> },
    { id: 'map', label: 'BẢN ĐỒ', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> }
  ];

  const mission = missions[0];

  return (
    <div className="pt-20 pb-24 max-w-4xl mx-auto px-4 space-y-6">
      
      {/* Search/Post Box */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center space-x-4">
        <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="w-10 h-10 rounded-full bg-gray-100 object-cover" alt="" />
        <div className="flex-1 text-gray-400 text-sm font-bold">Bạn đang muốn lan tỏa điều gì hôm nay?</div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {/* Hero Mission Card */}
      <div className="bg-[#045d43] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-6 left-8 bg-white/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
          SỨ MỆNH CỘNG ĐỒNG
        </div>
        <div className="mt-8">
          <h2 className="text-4xl font-black uppercase tracking-tight mb-2">SỨ MỆNH CỨU TRỢ</h2>
          <p className="text-xs font-bold text-emerald-200/80 uppercase tracking-widest leading-relaxed">
            QUẢN LÝ NGÂN SÁCH VÀ SỨ MỆNH VÙNG CAO HIỆU QUẢ MINH BẠCH.
          </p>
        </div>
      </div>

      {/* Horizontal Nav */}
      <div className="flex items-center justify-between px-2 overflow-x-auto scrollbar-hide py-2 gap-4">
        {navItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex flex-col items-center min-w-[70px] group"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 transition-all ${item.id === 'home' ? 'bg-[#045d43] text-white shadow-lg shadow-emerald-100' : 'bg-white text-gray-400 border border-gray-100 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
              {item.icon}
            </div>
            <span className={`text-[9px] font-black tracking-widest uppercase ${item.id === 'home' ? 'text-emerald-700' : 'text-gray-400'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Post Feed */}
      <div className="space-y-6">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewProfile(post.authorId)}>
                <img src={post.authorAvatar} className="w-12 h-12 rounded-full border border-gray-100 bg-gray-100" alt="" />
                <div>
                  <h4 className="font-black text-sm uppercase text-gray-900 tracking-tight">{post.authorName}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    2 giờ trước • Hà Giang
                  </p>
                </div>
              </div>
              <button className="text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
              </button>
            </div>
            
            <div className="px-6 pb-4">
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                {post.content}
              </p>
            </div>

            {post.media && post.media.length > 0 ? (
               <div className="px-4 pb-4">
                 <img src={post.media[0].url} className="w-full h-auto rounded-[1.5rem] object-cover" alt="" />
               </div>
            ) : post.mediaUrl ? (
               <div className="px-4 pb-4">
                 <img src={post.mediaUrl} className="w-full h-auto rounded-[1.5rem] object-cover" alt="" />
               </div>
            ) : null}

            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-50">
               <div className="flex -space-x-2">
                 {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200"></div>)}
                 <span className="ml-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">+42 người đã ủng hộ</span>
               </div>
               <div className="flex items-center space-x-4 text-gray-300">
                 <button className="hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg></button>
                 <button className="hover:text-emerald-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></button>
                 <button className="hover:text-blue-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg></button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
