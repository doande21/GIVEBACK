
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
  arrayRemove,
  setDoc,
  getDoc
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
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
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

  const handleHeart = async (post: SocialPost) => {
    const postRef = doc(db, "social_posts", post.id);
    const hasHearted = post.hearts?.includes(user.id);
    try {
      await updateDoc(postRef, {
        hearts: hasHearted ? arrayRemove(user.id) : arrayUnion(user.id)
      });
    } catch (err) { console.error(err); }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;
    const postRef = doc(db, "social_posts", postId);
    const newComment: PostComment = {
      id: Date.now().toString(),
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=059669&color=fff`,
      text: commentText.trim(),
      createdAt: new Date().toISOString()
    };
    try {
      await updateDoc(postRef, { comments: arrayUnion(newComment) });
      setCommentText('');
    } catch (err) { onNotify('error', "Lỗi gửi bình luận."); }
  };

  const handleStartChat = async (post: SocialPost) => {
    if (post.authorId === user.id) return;
    const chatId = user.id < post.authorId ? `chat_${user.id}_${post.authorId}` : `chat_${post.authorId}_${user.id}`;
    try {
      const chatRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatRef);
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          id: chatId, type: 'direct', participants: [user.id, post.authorId],
          donorId: post.authorId, donorName: post.authorName,
          receiverId: user.id, receiverName: user.name,
          lastMessage: `Chào đệ, mình thấy bài đăng của đệ rất hay!`,
          updatedAt: new Date().toISOString()
        });
      }
      setActiveTab('messages');
    } catch (err) { onNotify('error', "Lỗi kết nối."); }
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
      {/* Post Box */}
      <div onClick={() => setIsPostModalOpen(true)} className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center space-x-4 cursor-pointer hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-all active:scale-95">
        <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=059669&color=fff`} className="w-10 h-10 rounded-full bg-gray-100 object-cover" alt="" />
        <div className="flex-1 text-gray-400 dark:text-gray-500 text-sm font-bold">Đệ ơi, bạn đang nghĩ gì thế?</div>
        <div className="flex space-x-2 text-emerald-600">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v8a2 2 0 002 2z" /></svg>
        </div>
      </div>

      {/* Hero Mission */}
      {currentMission && (
        <div onClick={() => setActiveTab('missions')} className="bg-[#045d43] rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl group cursor-pointer hover:scale-[1.01] transition-all">
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-3 italic">VÌ {currentMission.location} THÂN YÊU</h2>
          <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden p-0.5 mt-6">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-200 rounded-full transition-all duration-1000 shadow-emerald-500/50" style={{ width: `${missionProgress}%` }}></div>
          </div>
          <p className="text-[10px] font-black uppercase mt-3 text-emerald-300">Tiến độ quyên góp: {missionProgress}%</p>
        </div>
      )}

      {/* Post Feed */}
      <div className="space-y-8">
        {posts.map(post => {
          const isHearted = post.hearts?.includes(user.id);
          const isCommentOpen = activeCommentPostId === post.id;
          return (
            <div key={post.id} className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-gray-50 dark:border-slate-800 overflow-hidden hover:shadow-2xl transition-all duration-500">
              <div className="p-8 flex items-center justify-between">
                <div className="flex items-center space-x-5 cursor-pointer" onClick={() => onViewProfile(post.authorId)}>
                  <img src={post.authorAvatar} className="w-14 h-14 rounded-3xl border-2 border-gray-50 dark:border-slate-800 object-cover shadow-sm" alt="" />
                  <div>
                    <h4 className="font-black text-sm uppercase text-emerald-950 dark:text-emerald-400 tracking-tighter leading-none">{post.authorName}</h4>
                    <p className="text-[9px] text-gray-300 font-bold uppercase tracking-[0.2em] mt-1">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
              </div>
              <div className="px-10 pb-8"><p className="text-base text-emerald-950 dark:text-slate-200 font-medium italic">"{post.content}"</p></div>
              {post.media?.[0] && (
                <div className="px-8 pb-8">
                  {post.media[0].type === 'video' ? <video src={post.media[0].url} className="w-full rounded-[3.5rem] shadow-2xl" controls /> : <img src={post.media[0].url} className="w-full rounded-[3.5rem] shadow-2xl" alt="" />}
                </div>
              )}
              <div className="px-10 py-6 flex items-center justify-between border-t border-gray-50 dark:border-slate-800 bg-gray-50/10 dark:bg-slate-900/10">
                 <div className="flex space-x-6">
                   <button onClick={() => handleHeart(post)} className={`flex items-center space-x-2 transition-all ${isHearted ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isHearted ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                     <span className="text-xs font-black">{post.hearts?.length || 0}</span>
                   </button>
                   <button onClick={() => setActiveCommentPostId(isCommentOpen ? null : post.id)} className={`flex items-center space-x-2 transition-all ${isCommentOpen ? 'text-emerald-600' : 'text-gray-300 dark:text-gray-600 hover:text-emerald-500'}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                     <span className="text-xs font-black">{post.comments?.length || 0}</span>
                   </button>
                 </div>
                 <button onClick={() => handleStartChat(post)} className="text-emerald-600 font-black text-[10px] uppercase tracking-widest px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-all">Nhắn tin</button>
              </div>

              {/* COMMENT SECTION: FB STYLE WITH EMERALD CARET */}
              {isCommentOpen && (
                <div className="px-10 py-8 bg-gray-50/30 dark:bg-slate-950/20 border-t border-gray-50 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
                  <div className="space-y-6 mb-8 max-h-64 overflow-y-auto pr-4 custom-scrollbar">
                    {post.comments?.length ? post.comments.map(c => (
                      <div key={c.id} className="flex space-x-4">
                        <img src={c.authorAvatar} className="w-8 h-8 rounded-xl object-cover shadow-sm" alt="" />
                        <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
                          <h5 className="text-[10px] font-black uppercase text-emerald-950 dark:text-emerald-400 mb-1">{c.authorName}</h5>
                          <p className="text-xs text-gray-700 dark:text-slate-300 font-medium">{c.text}</p>
                        </div>
                      </div>
                    )) : <p className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest py-4 italic">Hãy là người đầu tiên bình luận...</p>}
                  </div>

                  <div className="flex items-center space-x-3 group/input">
                    <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="w-9 h-9 rounded-2xl shadow-sm" alt="" />
                    <div className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full px-5 py-2.5 flex items-center border border-transparent focus-within:border-emerald-500/30 focus-within:bg-white dark:focus-within:bg-slate-700 transition-all shadow-inner">
                      <input 
                        type="text" 
                        placeholder={`Bình luận dưới tên ${user.name}...`} 
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-800 dark:text-slate-200 placeholder:text-gray-400 italic py-1.5"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      />
                      {/* Interaction Icons Like FB */}
                      <div className="flex items-center space-x-2 text-gray-400 dark:text-gray-500 mr-2">
                        <button className="hover:text-emerald-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                        <button className="hover:text-emerald-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg></button>
                        <button className="hover:text-emerald-500 transition-colors"><div className="text-[10px] font-black border border-current rounded px-1 scale-90">GIF</div></button>
                      </div>
                      <button 
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentText.trim()}
                        className={`transition-all ${commentText.trim() ? 'text-emerald-600 scale-110 send-active' : 'text-gray-300'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-45" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Post Modal */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md" onClick={() => setIsPostModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[4rem] p-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black uppercase italic text-emerald-950 dark:text-emerald-400">Tạo bài viết</h3>
               <button onClick={() => setIsPostModalOpen(false)} className="text-gray-300 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <form onSubmit={handleCreatePost} className="space-y-6">
                <textarea required rows={5} className="w-full bg-gray-50 dark:bg-slate-800 p-8 rounded-[2.5rem] font-bold text-lg outline-none border-2 border-transparent focus:border-emerald-500 transition-all placeholder:text-gray-300 italic dark:text-white" placeholder="Huynh đệ ơi, bạn đang nghĩ gì?" value={postContent} onChange={(e) => setPostContent(e.target.value)} />
                <button type="submit" disabled={isSubmitting || (!postContent.trim() && !postMedia)} className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 text-xs">Đăng ngay</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
