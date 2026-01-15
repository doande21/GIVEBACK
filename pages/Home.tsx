
import React, { useState, useEffect, useRef } from 'react';
import { User, SocialPost, CharityMission, PostMedia, PostComment } from '../types';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db } from '../services/firebase';

interface HomeProps {
  user: User;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
  onViewProfile: (userId: string) => void;
  setActiveTab: (tab: string) => void;
}

const compressImage = (base64Str: string, maxWidth = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } 
      else { if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; } }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

const Home: React.FC<HomeProps> = ({ user, onNotify, onViewProfile, setActiveTab }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postMedia, setPostMedia] = useState<{url: string, type: 'image' | 'video'} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubPosts = onSnapshot(query(collection(db, "social_posts"), orderBy("createdAt", "desc")), (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPost)));
    });
    const unsubMissions = onSnapshot(query(collection(db, "missions"), orderBy("createdAt", "desc"), limit(1)), (snap) => {
      setMissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });
    return () => { unsubPosts(); unsubMissions(); };
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && !postMedia) return;
    setIsSubmitting(true);
    try {
      const newPostData = {
        authorId: user.id,
        authorName: user.name,
        authorAvatar: user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=059669&color=fff`,
        authorIsGuest: user.isGuest || false,
        content: postContent,
        media: postMedia ? [{ url: postMedia.url, type: postMedia.type }] : [],
        createdAt: new Date().toISOString(),
        hearts: [],
        comments: []
      };
      await addDoc(collection(db, "social_posts"), newPostData);
      setPostContent('');
      setPostMedia(null);
      setIsPostModalOpen(false);
      onNotify('success', "Khoảnh khắc đã được sẻ chia!", "GIVEBACK");
    } catch (err) {
      onNotify('error', "Không thể đăng bài.", "Hệ thống");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      const isVideo = file.type.startsWith('video/');
      reader.onloadend = async () => {
        let finalData = reader.result as string;
        if (!isVideo) finalData = await compressImage(finalData);
        setPostMedia({ url: finalData, type: isVideo ? 'video' : 'image' });
      };
      reader.readAsDataURL(file);
    }
  };

  const currentMission = missions[0];
  const missionProgress = currentMission ? Math.min(100, Math.round((currentMission.currentBudget / currentMission.targetBudget) * 100)) : 0;

  return (
    <div className="pt-20 pb-24 max-w-4xl mx-auto px-4 space-y-8">
      <div onClick={() => setIsPostModalOpen(true)} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-emerald-50 dark:border-slate-800 flex items-center space-x-5 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all active:scale-95 group">
        <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=059669&color=fff`} className="w-12 h-12 rounded-2xl bg-gray-100 object-cover shadow-sm group-hover:rotate-6 transition-transform" alt="" />
        <div className="flex-1 text-gray-400 dark:text-gray-500 text-sm font-bold italic">
          {user.name} ơi, bạn đang nghĩ gì thế?
        </div>
        <div className="flex space-x-3 text-emerald-600">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" /></svg>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" /></svg>
        </div>
      </div>

      {currentMission && (
        <div onClick={() => setActiveTab('missions')} className="bg-[#045d43] rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl group cursor-pointer hover:scale-[1.01] transition-all">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 italic leading-none">VÌ {currentMission.location} THÂN YÊU</h2>
            <div className="w-full h-5 bg-white/10 rounded-full overflow-hidden p-0.5 mt-8 shadow-inner">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-200 rounded-full transition-all duration-1000 shadow-emerald-500/50" style={{ width: `${missionProgress}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-[10px] font-black uppercase text-emerald-300 tracking-[0.2em]">Tiến độ quyên góp: {missionProgress}%</p>
              <button className="bg-white/20 hover:bg-white text-white hover:text-emerald-900 px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all backdrop-blur-md">Chi tiết &rarr;</button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
        </div>
      )}

      <div className="space-y-10">
        {posts.map(post => {
          const isHearted = post.hearts?.includes(user.id);
          return (
            <div key={post.id} className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-sm border border-gray-50 dark:border-slate-800 overflow-hidden hover:shadow-2xl transition-all duration-500">
              <div className="p-8 flex items-center justify-between">
                <div className="flex items-center space-x-5 cursor-pointer" onClick={() => onViewProfile(post.authorId)}>
                  <img src={post.authorAvatar} className="w-16 h-16 rounded-[2rem] border-4 border-gray-50 dark:border-slate-800 object-cover shadow-md" alt="" />
                  <div>
                    <h4 className="font-black text-base uppercase text-emerald-950 dark:text-emerald-400 tracking-tighter leading-none">{post.authorName}</h4>
                    <p className="text-[9px] text-gray-300 font-bold uppercase tracking-[0.2em] mt-1.5">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
              </div>
              <div className="px-12 pb-8"><p className="text-lg text-emerald-950 dark:text-slate-200 font-medium italic leading-relaxed">"{post.content}"</p></div>
              {post.media?.[0] && (
                <div className="px-8 pb-10">
                  {post.media[0].type === 'video' ? 
                    <video src={post.media[0].url} className="w-full max-h-[500px] rounded-[4rem] shadow-2xl border-4 border-white dark:border-slate-800 object-contain bg-black" controls /> : 
                    <img src={post.media[0].url} className="w-full rounded-[4rem] shadow-2xl border-4 border-white dark:border-slate-800" alt="" />
                  }
                </div>
              )}
              <div className="px-12 py-8 flex items-center justify-between border-t border-gray-50 dark:border-slate-800 bg-gray-50/20 dark:bg-slate-900/10">
                 <div className="flex space-x-8">
                   <button onClick={() => {
                     const postRef = doc(db, "social_posts", post.id);
                     updateDoc(postRef, {
                       hearts: isHearted ? arrayRemove(user.id) : arrayUnion(user.id)
                     });
                   }} className={`flex items-center space-x-3 transition-all ${isHearted ? 'text-red-500 scale-110' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${isHearted ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0 -6.364 -6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0 -6.364 0z" /></svg>
                     <span className="text-sm font-black">{post.hearts?.length || 0}</span>
                   </button>
                 </div>
                 <button onClick={() => {
                   if (post.authorId === user.id) return;
                   setActiveTab('messages');
                 }} className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-8 py-3 rounded-2xl hover:bg-emerald-700 active:scale-95 transition-all shadow-xl shadow-emerald-100 dark:shadow-none">Nhắn tin</button>
              </div>
            </div>
          );
        })}
      </div>

      {isPostModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md" onClick={() => setIsPostModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[4rem] p-12 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-10">
               <h3 className="text-3xl font-black uppercase italic text-emerald-950 dark:text-emerald-400 tracking-tighter">Tạo bài viết</h3>
               <button onClick={() => setIsPostModalOpen(false)} className="text-gray-300 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <form onSubmit={handleCreatePost} className="space-y-8">
                <textarea 
                  required 
                  rows={4} 
                  className="w-full bg-gray-50 dark:bg-slate-800 p-10 rounded-[3rem] font-bold text-xl outline-none border-2 border-transparent focus:border-emerald-500 transition-all placeholder:text-gray-300 italic dark:text-white" 
                  placeholder={`${user.name} ơi, bạn đang nghĩ gì thế?`} 
                  value={postContent} 
                  onChange={(e) => setPostContent(e.target.value)} 
                />

                {postMedia && (
                  <div className="relative rounded-[3rem] overflow-hidden border-4 border-emerald-100 shadow-xl bg-gray-50">
                    {postMedia.type === 'video' ? 
                      <video src={postMedia.url} className="w-full h-56 object-contain bg-black" controls /> : 
                      <img src={postMedia.url} className="w-full h-56 object-cover" alt="Preview" />
                    }
                    <button 
                      type="button" 
                      onClick={() => setPostMedia(null)}
                      className="absolute top-4 right-4 bg-black/50 text-white p-3 rounded-full hover:bg-red-500 transition-all shadow-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                )}

                <div className="flex items-center space-x-5">
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center space-x-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 px-8 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 dark:border-emerald-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" /></svg>
                    <span>Ảnh / Video</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                </div>

                <button type="submit" disabled={isSubmitting || (!postContent.trim() && !postMedia)} className="w-full bg-emerald-600 text-white py-7 rounded-[2.5rem] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 text-sm">Đăng ngay</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
