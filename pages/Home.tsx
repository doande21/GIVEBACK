
import React, { useState, useEffect, useRef } from 'react';
import { User, SocialPost, CharityMission, PostComment, PostMedia, Sponsor } from '../types';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  limit,
  getDocs,
  where,
  documentId
} from "firebase/firestore";
import { db } from '../services/firebase';

const compressImage = (base64Str: string, maxWidth = 600, quality = 0.5): Promise<string> => {
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

const PostMediaGrid: React.FC<{ media?: PostMedia[], mediaUrl?: string, mediaType?: 'image' | 'video' }> = ({ media, mediaUrl, mediaType }) => {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  
  const allMedia = media && media.length > 0 ? media : (mediaUrl ? [{url: mediaUrl, type: mediaType || 'image'}] : []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewingIndex === null) return;
      if (e.key === 'ArrowRight') nextMedia();
      if (e.key === 'ArrowLeft') prevMedia();
      if (e.key === 'Escape') setViewingIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingIndex, allMedia.length]);

  const nextMedia = () => {
    if (viewingIndex !== null && viewingIndex < allMedia.length - 1) setViewingIndex(viewingIndex + 1);
  };

  const prevMedia = () => {
    if (viewingIndex !== null && viewingIndex > 0) setViewingIndex(viewingIndex - 1);
  };

  const renderItem = (m: PostMedia | {url: string, type: string}, idx: number, className: string) => (
    <div 
      key={idx} 
      className={`relative overflow-hidden bg-gray-100 cursor-pointer group/media ${className}`}
      onClick={() => setViewingIndex(idx)}
    >
      {m.type === 'video' ? (
        <video src={m.url || ''} className="w-full h-full object-cover" />
      ) : (
        <>
          <img src={m.url || 'https://placehold.co/600x400?text=No+Image'} className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105" alt="" />
          <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 transition-colors flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white opacity-0 group-hover/media:opacity-100 transition-opacity shadow-xl" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {allMedia.length > 0 && (
        <div className={`grid gap-1 w-full max-h-[500px] rounded-[2rem] overflow-hidden my-4 border border-gray-100 shadow-sm
          ${allMedia.length === 1 ? 'grid-cols-1' : allMedia.length === 2 ? 'grid-cols-2 aspect-video' : 'grid-cols-2 grid-rows-2 aspect-square'}`}>
          {allMedia.length === 1 && renderItem(allMedia[0], 0, "h-full")}
          {allMedia.length === 2 && <>{renderItem(allMedia[0], 0, "h-full")}{renderItem(allMedia[1], 1, "h-full")}</>}
          {allMedia.length >= 3 && (
            <>
              {renderItem(allMedia[0], 0, "row-span-2 h-full")}
              {renderItem(allMedia[1], 1, "h-full")}
              <div className="h-full relative">
                {renderItem(allMedia[2], 2, "h-full")}
                {allMedia.length > 3 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                    <span className="text-white font-black text-xl">+{allMedia.length - 3}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {viewingIndex !== null && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setViewingIndex(null)}></div>
          
          <div className="absolute top-8 right-8 flex items-center gap-6 z-10">
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] bg-white/10 px-4 py-2 rounded-full border border-white/10">
              {viewingIndex + 1} / {allMedia.length}
            </span>
            <button onClick={() => setViewingIndex(null)} className="text-white/50 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {viewingIndex > 0 && (
            <button onClick={prevMedia} className="absolute left-8 z-10 bg-white/10 hover:bg-white/20 p-5 rounded-full text-white transition-all backdrop-blur-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}

          {viewingIndex < allMedia.length - 1 && (
            <button onClick={nextMedia} className="absolute right-8 z-10 bg-white/10 hover:bg-white/20 p-5 rounded-full text-white transition-all backdrop-blur-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}

          <div className="relative w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-500">
            {allMedia[viewingIndex].type === 'video' ? (
              <video src={allMedia[viewingIndex].url} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" />
            ) : (
              <img src={allMedia[viewingIndex].url} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Fullscreen" />
            )}
          </div>
        </div>
      )}
    </>
  );
};

interface HomeProps {
  user: User;
  onNotify: (type: any, message: string, sender?: string) => void;
  onViewProfile: (userId: string) => void;
}

const Home: React.FC<HomeProps> = ({ user, onNotify, onViewProfile }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<CharityMission | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<PostMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  const [interactionModalPost, setInteractionModalPost] = useState<SocialPost | null>(null);
  const [interactionTab, setInteractionTab] = useState<'hearts' | 'thanks' | 'comments'>('hearts');
  const [interactionUsers, setInteractionUsers] = useState<User[]>([]);
  const [fetchingInteractions, setFetchingInteractions] = useState(false);
  const [zoomedQr, setZoomedQr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubPosts = onSnapshot(query(collection(db, "social_posts"), orderBy("createdAt", "desc")), (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPost)));
    });
    const unsubMissions = onSnapshot(query(collection(db, "missions"), orderBy("createdAt", "desc"), limit(5)), (snap) => {
      setMissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });
    return () => { unsubPosts(); unsubMissions(); };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = (Array.from(e.target.files || []) as File[]).slice(0, 4 - selectedFiles.length);
    if (files.length === 0 && selectedFiles.length >= 4) {
      onNotify('warning', 'Tối đa 4 ảnh cho bài viết bạn nhé!');
      return;
    }
    setIsCompressing(true);
    for (const file of files) {
      const reader = new FileReader();
      const res = await new Promise<PostMedia>((resolve) => {
        reader.onloadend = async () => {
          let url = reader.result as string;
          let type: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
          if (type === 'image') url = await compressImage(url);
          resolve({ url, type });
        };
        reader.readAsDataURL(file);
      });
      setSelectedFiles(prev => [...prev, res].slice(0, 4));
    }
    setIsCompressing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const fetchInteractionUsers = async (uids: string[]) => {
    if (!uids || uids.length === 0) { setInteractionUsers([]); return; }
    setFetchingInteractions(true);
    try {
      const chunks = [];
      for (let i = 0; i < uids.length; i += 10) { chunks.push(uids.slice(i, i + 10)); }
      const allUsers: User[] = [];
      for (const chunk of chunks) {
        const q = query(collection(db, "users"), where(documentId(), "in", chunk));
        const snap = await getDocs(q);
        snap.forEach(d => allUsers.push({ ...d.data(), id: d.id } as User));
      }
      setInteractionUsers(allUsers);
    } catch (e) { console.error(e); }
    finally { setFetchingInteractions(false); }
  };

  useEffect(() => {
    if (interactionModalPost) {
      if (interactionTab === 'hearts') fetchInteractionUsers(interactionModalPost.hearts || []);
      else if (interactionTab === 'thanks') fetchInteractionUsers(interactionModalPost.thanks || []);
    }
  }, [interactionTab, interactionModalPost]);

  const handlePost = async () => {
    if (!content.trim() && selectedFiles.length === 0) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "social_posts"), {
        authorId: user.id, authorName: user.name, 
        authorAvatar: user.avatar || `https://ui-avatars.com/api/?name=${user.name}`,
        authorIsGuest: user.isGuest || false,
        content: content.trim(), media: selectedFiles,
        likes: [], hearts: [], thanks: [], comments: [], sharesCount: 0,
        createdAt: new Date().toISOString()
      });
      setContent(''); setSelectedFiles([]); setIsPosting(false);
      onNotify('success', "Lan tỏa thành công!", 'Hệ thống');
    } catch (err: any) { 
      onNotify('error', "Lỗi đăng bài (có thể do ảnh quá nặng, Bạn thử ít ảnh hơn nhé)."); 
    } finally { setLoading(false); }
  };

  const handleReaction = async (postId: string, type: 'hearts' | 'thanks') => {
    const postRef = doc(db, "social_posts", postId);
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const list = (post as any)[type] || [];
    if (list.includes(user.id)) await updateDoc(postRef, { [type]: arrayRemove(user.id) });
    else await updateDoc(postRef, { [type]: arrayUnion(user.id) });
  };

  const handleComment = async (postId: string) => {
    if (!commentText.trim()) return;
    const postRef = doc(db, "social_posts", postId);
    await updateDoc(postRef, { comments: arrayUnion({
      id: Math.random().toString(36).substr(2, 9),
      authorId: user.id, authorName: user.name,
      authorAvatar: user.avatar || `https://ui-avatars.com/api/?name=${user.name}`,
      text: commentText.trim(), createdAt: new Date().toISOString()
    })});
    setCommentText(''); setCommentingPostId(null);
  };

  const openInteractionModal = (post: SocialPost, tab: 'hearts' | 'thanks' | 'comments') => {
    setInteractionModalPost(post);
    setInteractionTab(tab);
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 font-['Inter']">
      <div className="flex-1 space-y-6">
        <div className="bg-white rounded-[2.5rem] shadow-sm p-6 border border-gray-100 flex items-center space-x-4">
          <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="w-12 h-12 rounded-2xl object-cover" alt="" />
          <button onClick={() => setIsPosting(true)} className="flex-1 bg-gray-50 hover:bg-emerald-50 text-gray-400 text-left px-8 py-4 rounded-full text-xs italic font-medium transition-all">
            {user.name} ơi, bạn muốn lan tỏa điều gì hôm nay?
          </button>
        </div>

        <div className="space-y-8">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewProfile(post.authorId)}>
                  <img src={post.authorAvatar || `https://ui-avatars.com/api/?name=${post.authorName}`} className="w-11 h-11 rounded-2xl object-cover border border-emerald-50" alt="" />
                  <div>
                    <h4 className="font-black text-sm uppercase italic tracking-tighter text-emerald-950 flex items-center gap-2">
                      {post.authorName}
                      {post.authorIsGuest && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">GUEST</span>}
                    </h4>
                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
              </div>
              <div className="px-8 pb-4"><p className="text-sm text-gray-800 leading-relaxed font-medium italic">"{post.content}"</p></div>
              <div className="px-4"><PostMediaGrid media={post.media} mediaUrl={post.mediaUrl} mediaType={post.mediaType} /></div>
              
              <div className="px-6 py-4 flex items-center space-x-2 border-t border-gray-50 bg-gray-50/30">
                 <div className="flex items-center space-x-1">
                   <button onClick={() => handleReaction(post.id, 'hearts')} className={`p-2 rounded-full transition-all ${post.hearts?.includes(user.id) ? 'text-red-600 scale-110' : 'text-gray-300 hover:text-red-400'}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={post.hearts?.includes(user.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                   </button>
                   <button onClick={() => openInteractionModal(post, 'hearts')} className="text-[10px] font-black text-gray-400 hover:text-emerald-700 transition-colors uppercase tracking-widest">
                     {post.hearts?.length || 0} yêu thích
                   </button>
                 </div>

                 <div className="flex items-center space-x-1 ml-4">
                   <button onClick={() => handleReaction(post.id, 'thanks')} className={`p-2 rounded-full transition-all ${post.thanks?.includes(user.id) ? 'text-amber-500 scale-110' : 'text-gray-300 hover:text-amber-400'}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={post.thanks?.includes(user.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
                   </button>
                   <button onClick={() => openInteractionModal(post, 'thanks')} className="text-[10px] font-black text-gray-400 hover:text-emerald-700 transition-colors uppercase tracking-widest">
                     {post.thanks?.length || 0} biết ơn
                   </button>
                 </div>

                 <div className="flex items-center space-x-1 ml-4">
                   <button onClick={() => setCommentingPostId(commentingPostId === post.id ? null : post.id)} className={`p-2 rounded-full transition-all ${commentingPostId === post.id ? 'text-emerald-600' : 'text-gray-300 hover:text-emerald-400'}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                   </button>
                   <button onClick={() => openInteractionModal(post, 'comments')} className="text-[10px] font-black text-gray-400 hover:text-emerald-700 transition-colors uppercase tracking-widest px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                     {post.comments?.length || 0} bình luận
                   </button>
                 </div>
              </div>

              {commentingPostId === post.id && (
                <div className="px-8 pb-6 pt-4 bg-gray-50/20 border-t border-gray-50/30 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex space-x-3 items-center">
                    <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="w-8 h-8 rounded-xl object-cover" alt="" />
                    <div className="flex-1 relative">
                       <input 
                        type="text" 
                        placeholder="Viết cảm nghĩ của đệ..." 
                        className="w-full bg-white border border-gray-100 px-6 py-3 rounded-full text-xs font-medium italic outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-inner" 
                        value={commentText} 
                        onChange={(e) => setCommentText(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)} 
                       />
                       <button 
                        onClick={() => handleComment(post.id)} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 text-white p-2 rounded-full shadow-lg hover:bg-emerald-700 transition-all active:scale-90"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                       </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-80 space-y-6">
        <div className="bg-emerald-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
           <h3 className="text-xl font-black italic uppercase mb-2">Sứ mệnh cứu trợ</h3>
           <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest mb-6 italic">Quản lý ngân sách và sứ mệnh vùng cao</p>
           <div className="space-y-4">
              {missions.map(m => (
                <div key={m.id} className="relative group cursor-pointer overflow-hidden rounded-[2.5rem] aspect-[4/3] shadow-xl border border-white/10" onClick={() => setSelectedMission(m)}>
                   <img src={m.image || "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=600"} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                   <div className="absolute inset-x-6 bottom-6">
                      <h4 className="text-lg font-black uppercase italic text-white tracking-tighter leading-none">{m.location}</h4>
                      <p className="text-[8px] text-emerald-300 font-bold mt-1 uppercase">{new Date(m.date).toLocaleDateString('vi-VN')}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {isPosting && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-10 overflow-y-auto">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md" onClick={() => setIsPosting(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-8 md:p-10 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black uppercase italic text-emerald-950">Lan tỏa yêu thương</h3>
                <button onClick={() => setIsPosting(false)} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="space-y-6">
                <textarea 
                  rows={4} 
                  placeholder="Đệ đang nghĩ gì về hành trình hôm nay..." 
                  className="w-full bg-gray-50 p-6 rounded-[2.5rem] font-medium italic outline-none border-2 border-transparent focus:border-emerald-500 transition-all text-sm leading-relaxed" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                />
                
                <div className="min-h-[150px] bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-emerald-100 p-4">
                  {selectedFiles.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden shadow-sm group">
                          {f.type === 'video' ? <video src={f.url} className="w-full h-full object-cover" /> : <img src={f.url} className="w-full h-full object-cover" alt="" />}
                          <button onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="h-full flex flex-col items-center justify-center text-gray-300 cursor-pointer hover:text-emerald-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">Tải ảnh/video hàng loạt (Tối đa 4)</span>
                    </div>
                  )}
                </div>

                {selectedFiles.length > 0 && selectedFiles.length < 4 && (
                   <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-widest">Chọn thêm file khác ({selectedFiles.length}/4) +</button>
                )}

                <button 
                  onClick={handlePost} 
                  disabled={loading || isCompressing || (!content.trim() && selectedFiles.length === 0)} 
                  className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 text-xs"
                >
                  {loading ? 'ĐANG LAN TỎA...' : isCompressing ? 'ĐANG XỬ LÝ MEDIA...' : 'ĐĂNG BÀI NGAY'}
                </button>
             </div>
             <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
          </div>
        </div>
      )}

      {interactionModalPost && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xl" onClick={() => setInteractionModalPost(null)}></div>
          <div className="relative bg-white w-full max-w-lg max-h-[80vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
             <div className="p-8 border-b bg-gray-50/50 flex items-center justify-between">
                <div className="flex bg-gray-200/50 p-1.5 rounded-2xl shadow-inner w-full mr-4">
                  <button onClick={() => setInteractionTab('hearts')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${interactionTab === 'hearts' ? 'bg-white text-red-600 shadow-md' : 'text-gray-400'}`}>Yêu thích</button>
                  <button onClick={() => setInteractionTab('thanks')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${interactionTab === 'thanks' ? 'bg-white text-amber-600 shadow-md' : 'text-gray-400'}`}>Biết ơn</button>
                  <button onClick={() => setInteractionTab('comments')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${interactionTab === 'comments' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400'}`}>Bình luận</button>
                </div>
                <button onClick={() => setInteractionModalPost(null)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {interactionTab === 'comments' ? (
                  <div className="space-y-6">
                    {interactionModalPost.comments?.map(c => (
                      <div key={c.id} className="flex gap-4 group">
                        <img src={c.authorAvatar} onClick={() => { setInteractionModalPost(null); onViewProfile(c.authorId); }} className="w-10 h-10 rounded-2xl object-cover cursor-pointer border-2 border-transparent group-hover:border-emerald-500 transition-all shadow-sm" alt="" />
                        <div className="flex-1 bg-gray-50 p-5 rounded-[1.5rem] rounded-tl-none border border-gray-100">
                           <div className="flex justify-between items-center mb-2">
                              <h5 className="text-[11px] font-black uppercase italic text-emerald-950 cursor-pointer" onClick={() => { setInteractionModalPost(null); onViewProfile(c.authorId); }}>{c.authorName}</h5>
                              <span className="text-[8px] text-gray-400 font-bold">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                           </div>
                           <p className="text-xs text-gray-700 italic font-medium leading-relaxed">"{c.text}"</p>
                        </div>
                      </div>
                    ))}
                    {!interactionModalPost.comments?.length && <p className="text-center py-20 text-[10px] font-black text-gray-300 uppercase italic tracking-widest">Chưa có bình luận nào...</p>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fetchingInteractions ? (
                      <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div></div>
                    ) : (
                      interactionUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-emerald-50 transition-colors cursor-pointer" onClick={() => { setInteractionModalPost(null); onViewProfile(u.id); }}>
                           <div className="flex items-center space-x-4">
                              <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} className="w-11 h-11 rounded-2xl object-cover shadow-sm" alt="" />
                              <div>
                                 <h5 className="text-xs font-black uppercase italic text-gray-900">{u.name}</h5>
                                 <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">{u.userType === 'organization' ? 'Tổ chức' : 'Thành viên'}</p>
                              </div>
                           </div>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                        </div>
                      ))
                    )}
                    {!fetchingInteractions && interactionUsers.length === 0 && (
                      <p className="text-center py-20 text-[10px] font-black text-gray-300 uppercase italic tracking-widest">Chưa có ai tương tác mục này...</p>
                    )}
                  </div>
                )}
             </div>

             <div className="p-8 bg-emerald-900 text-center">
                <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest italic">Cảm ơn những tấm lòng vàng đã lan tỏa yêu thương</p>
             </div>
          </div>
        </div>
      )}

      {selectedMission && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xl" onClick={() => setSelectedMission(null)}></div>
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="relative h-80 bg-emerald-900 flex-shrink-0">
              <img src={selectedMission.image || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200'} className="w-full h-full object-cover" alt="" />
              <div className="absolute top-8 right-8 z-20">
                <button onClick={() => setSelectedMission(null)} className="bg-black/20 p-3 rounded-full text-white/70 hover:text-white transition-colors backdrop-blur-md border border-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-10 left-12 text-white">
                <h2 className="text-5xl font-black italic uppercase tracking-tighter drop-shadow-2xl">{selectedMission.location}</h2>
                <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em] mt-2 italic">HÀNH TRÌNH NHÂN ÁI - {new Date(selectedMission.date).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 md:p-12 custom-scrollbar bg-gray-50/20">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-12">
                     <section>
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-4 italic">Mục tiêu chiến dịch</h4>
                        <p className="text-xl text-gray-800 leading-relaxed italic font-medium">"{selectedMission.description}"</p>
                     </section>
                     <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-emerald-50">
                           <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Hộ dân hỗ trợ</p>
                           <p className="text-2xl font-black text-emerald-950 italic">~{selectedMission.targetHouseholds || 50}</p>
                        </div>
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-emerald-50">
                           <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Thời gian</p>
                           <p className="text-sm font-black text-emerald-950 uppercase">{new Date(selectedMission.date).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-emerald-50 col-span-2 md:col-span-1">
                           <p className="text-[8px] font-black text-amber-600 uppercase italic tracking-tighter">{selectedMission.status === 'upcoming' ? 'Sắp diễn ra' : selectedMission.status === 'ongoing' ? 'Đang triển khai' : 'Hoàn thành'}</p>
                        </div>
                     </section>
                     <section className="space-y-8">
                        <div>
                           <div className="flex justify-between items-end mb-4 px-2">
                              <h4 className="text-[10px] font-black text-emerald-950 uppercase tracking-[0.4em] italic">Ngân sách dự kiến</h4>
                              <p className="text-sm font-black text-emerald-700 italic">{((selectedMission.currentBudget || 0) / (selectedMission.targetBudget || 1) * 100).toFixed(0)}% <span className="text-[10px] text-gray-400">({(selectedMission.currentBudget || 0).toLocaleString()} / {(selectedMission.targetBudget || 0).toLocaleString()}đ)</span></p>
                           </div>
                           <div className="h-5 bg-gray-200 rounded-full overflow-hidden shadow-inner border border-gray-100 p-1">
                              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${Math.min(100, (selectedMission.currentBudget || 0) / (selectedMission.targetBudget || 1) * 100)}%` }}></div>
                           </div>
                        </div>
                        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100">
                           <h4 className="text-[10px] font-black text-emerald-950 uppercase tracking-[0.4em] mb-6 italic">Nhu yếu phẩm cần thiết</h4>
                           <div className="space-y-6">
                              {(selectedMission.itemsNeeded || []).map((neededItem, idx) => {
                                 const progress = (neededItem.current / neededItem.target) * 100;
                                 return (
                                    <div key={idx} className="space-y-2">
                                       <div className="flex justify-between text-[11px] font-black uppercase italic tracking-tighter px-1">
                                          <span>{neededItem.name}</span>
                                          <span className="text-emerald-600">{neededItem.current} / {neededItem.target} {neededItem.unit}</span>
                                       </div>
                                       <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-emerald-300'}`} style={{ width: `${Math.min(100, progress)}%` }}></div></div>
                                    </div>
                                 );
                              })}
                              {(!selectedMission.itemsNeeded || selectedMission.itemsNeeded.length === 0) && <p className="text-center py-6 text-[10px] font-black text-gray-300 uppercase italic">Chưa có danh sách chi tiết</p>}
                           </div>
                        </div>
                     </section>
                  </div>
                  <div className="space-y-8">
                     <div className="bg-white p-8 rounded-[3.5rem] shadow-xl border border-amber-50 text-center sticky top-0 cursor-pointer group/qr" onClick={() => setZoomedQr(selectedMission.qrCode || 'https://placehold.co/800x800?text=QR')}>
                        <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-[0.3em] mb-6 italic group-hover/qr:text-emerald-600 transition-colors">ỦNG HỘ CHIẾN DỊCH</h4>
                        <div className="relative mx-auto w-52 h-52 bg-gray-50 rounded-[3rem] border-4 border-white shadow-inner flex items-center justify-center overflow-hidden mb-6 p-4 group-hover/qr:scale-105 transition-transform">
                           <img src={selectedMission.qrCode || 'https://placehold.co/400x400?text=QR'} className="w-full h-full object-contain" alt="QR" />
                           <div className="absolute inset-0 bg-emerald-950/20 opacity-0 group-hover/qr:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[1px]">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                           </div>
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase italic leading-relaxed">Nhấn vào mã để phóng to & quét<br/>quyên góp trực tiếp</p>
                     </div>
                  </div>
               </div>
            </div>
            <div className="p-8 bg-emerald-950 text-center flex-shrink-0">
               <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.5em] italic">GIVEBACK - Nơi yêu thương lan tỏa</p>
            </div>
          </div>
        </div>
      )}

      {zoomedQr && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setZoomedQr(null)}></div>
          <div className="relative bg-white p-12 rounded-[4rem] shadow-2xl animate-in zoom-in-95 duration-500 max-w-lg w-full">
            <button onClick={() => setZoomedQr(null)} className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest">ĐÓNG LẠI</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black italic uppercase text-emerald-950 tracking-tighter">QUÉT MÃ ỦNG HỘ</h3>
            </div>
            <div className="bg-gray-50 p-6 rounded-[3rem] shadow-inner border border-gray-100"><img src={zoomedQr} className="w-full h-auto object-contain rounded-2xl" alt="Zoomed QR" /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
