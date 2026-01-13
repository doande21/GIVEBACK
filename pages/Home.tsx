
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
  setDoc
} from "firebase/firestore";
import { db } from '../services/firebase';
import { generateMissionVideo } from '../services/geminiService';

const compressImage = (base64Str: string, maxWidth = 1000, quality = 0.7): Promise<string> => {
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
  if (media && media.length > 0) {
    const count = media.length;
    const renderItem = (m: PostMedia, idx: number, className: string) => (
      <div key={idx} className={`relative overflow-hidden bg-gray-100 ${className}`}>
        {m.type === 'video' ? <video src={m.url || ''} controls className="w-full h-full object-cover" /> : <img src={m.url || 'https://placehold.co/600x400?text=No+Image'} className="w-full h-full object-cover" alt="" />}
      </div>
    );
    return (
      <div className={`grid gap-1 w-full max-h-[500px] rounded-[2rem] overflow-hidden my-4 border border-gray-100 shadow-sm
        ${count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2 aspect-video' : 'grid-cols-2 grid-rows-2 aspect-square'}`}>
        {count === 1 && renderItem(media[0], 0, "h-full")}
        {count === 2 && <>{renderItem(media[0], 0, "h-full")}{renderItem(media[1], 1, "h-full")}</>}
        {count >= 3 && <>{renderItem(media[0], 0, "row-span-2 h-full")}{renderItem(media[1], 1, "h-full")}<div className="h-full relative">{renderItem(media[2], 2, "h-full")}{count > 3 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-black text-xl">+{count - 3}</span></div>}</div></>}
      </div>
    );
  }
  if (mediaUrl) {
    return (
      <div className="w-full rounded-[2rem] overflow-hidden my-4 border border-gray-100 shadow-sm bg-gray-50">
        {mediaType === 'video' ? <video src={mediaUrl || ''} controls className="w-full max-h-[500px] object-contain" /> : <img src={mediaUrl || 'https://placehold.co/600x400?text=No+Image'} className="w-full h-auto max-h-[500px] object-contain mx-auto" alt="" />}
      </div>
    );
  }
  return null;
};

interface HomeProps {
  user: User;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
  onViewProfile: (userId: string) => void;
}

const Home: React.FC<HomeProps> = ({ user, onNotify, onViewProfile }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [globalQrUrl, setGlobalQrUrl] = useState<string>('');
  const [selectedMission, setSelectedMission] = useState<CharityMission | null>(null);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<{ url: string, type: 'image' | 'video' }[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  // States cho Video AI
  const [aiVideoUrl, setAiVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [aiVideoProgress, setAiVideoProgress] = useState('');

  const qrInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onSnapshot(query(collection(db, "social_posts"), orderBy("createdAt", "desc")), (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPost)));
    });
    onSnapshot(query(collection(db, "missions"), orderBy("createdAt", "desc"), limit(5)), (snap) => {
      setMissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });
    onSnapshot(collection(db, "sponsors"), (snap) => {
      setSponsors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sponsor)));
    });
    onSnapshot(doc(db, "settings", "donation_qr"), (snap) => {
      if (snap.exists()) setGlobalQrUrl(snap.data().url);
    });
  }, []);

  const handlePost = async () => {
    if (!content.trim() && selectedFiles.length === 0) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "social_posts"), {
        authorId: user.id, authorName: user.name, 
        authorAvatar: user.avatar || `https://ui-avatars.com/api/?name=${user.name}`,
        content: content.trim(), media: selectedFiles,
        likes: [], hearts: [], thanks: [], comments: [], sharesCount: 0,
        createdAt: new Date().toISOString()
      });
      setContent(''); setSelectedFiles([]); setIsPosting(false);
      onNotify('success', "Lan tỏa thành công!", 'Hệ thống');
    } catch (err: any) { onNotify('error', "Lỗi đăng bài."); } finally { setLoading(false); }
  };

  const handleGenerateAIPreview = async () => {
    if (!selectedMission) return;
    setIsGeneratingVideo(true);
    setAiVideoProgress("AI đang phác họa hành trình (có thể mất vài phút)...");
    onNotify('info', "Đang khởi tạo Veo Engine...", "GIVEBACK AI");
    
    try {
      const videoUrl = await generateMissionVideo(`Happy children receiving gifts and laughing in ${selectedMission.location}, cinematic drone shots of mountains.`);
      if (videoUrl) {
        setAiVideoUrl(videoUrl);
        onNotify('success', "Tầm nhìn AI đã hoàn tất!", "GIVEBACK AI");
      } else {
        onNotify('error', "Không thể tạo video AI lúc này.", "GIVEBACK AI");
      }
    } catch (err) {
      onNotify('error', "Lỗi trong quá trình tạo video AI.");
    } finally {
      setIsGeneratingVideo(false);
      setAiVideoProgress("");
    }
  };

  const handleReaction = async (postId: string, type: 'likes' | 'hearts' | 'thanks') => {
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

  const closeModal = () => { 
    setSelectedMission(null); 
    setAiVideoUrl(null);
  };

  const missionSponsors = selectedMission 
    ? sponsors.filter(s => s.history?.some(h => h.missionName.toLowerCase().includes(selectedMission.location.toLowerCase())))
    : [];

  const isAdmin = user.role === 'admin';

  return (
    <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 font-['Inter']">
      {/* FEED CONTENT */}
      <div className="flex-1 space-y-6">
        <div className="bg-white rounded-[2.5rem] shadow-sm p-6 border border-gray-100 flex items-center space-x-4">
          <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="w-12 h-12 rounded-2xl object-cover" alt="" />
          <button onClick={() => setIsPosting(true)} className="flex-1 bg-gray-50 hover:bg-emerald-50 text-gray-400 text-left px-8 py-4 rounded-full text-xs italic font-medium transition-all">
            {user.name} ơi, đệ muốn lan tỏa điều gì hôm nay?
          </button>
        </div>

        <div className="space-y-8">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewProfile(post.authorId)}>
                  <img src={post.authorAvatar || `https://ui-avatars.com/api/?name=${post.authorName}`} className="w-11 h-11 rounded-2xl object-cover border border-emerald-50" alt="" />
                  <div>
                    <h4 className="font-black text-sm uppercase italic tracking-tighter text-emerald-950">{post.authorName}</h4>
                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
              </div>
              <div className="px-8 pb-4"><p className="text-sm text-gray-800 leading-relaxed font-medium italic">"{post.content}"</p></div>
              <div className="px-4"><PostMediaGrid media={post.media} mediaUrl={post.mediaUrl} mediaType={post.mediaType} /></div>
              <div className="px-6 py-4 flex items-center space-x-4 border-t border-gray-50 bg-gray-50/30">
                 <button onClick={() => handleReaction(post.id, 'hearts')} className={`flex items-center space-x-1.5 px-4 py-2 rounded-full ${post.hearts?.includes(user.id) ? 'bg-red-50 text-red-600' : 'text-gray-400'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={post.hearts?.includes(user.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                   <span className="text-[10px] font-black">{post.hearts?.length || 0}</span>
                 </button>
                 <button onClick={() => setCommentingPostId(commentingPostId === post.id ? null : post.id)} className="flex items-center space-x-1.5 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span className="text-[10px] font-black">{post.comments?.length || 0}</span></button>
              </div>
              {commentingPostId === post.id && (
                <div className="px-8 pb-6 pt-2 bg-gray-50/20">
                  <div className="flex space-x-2">
                    <input type="text" placeholder="Viết cảm nghĩ..." className="flex-1 bg-gray-100 border-none px-5 py-2 rounded-full text-xs outline-none" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)} />
                    <button onClick={() => handleComment(post.id)} className="bg-emerald-600 text-white p-2 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CỘT PHẢI: SỨ MỆNH */}
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

        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-emerald-50 text-center relative overflow-hidden group">
           <h4 className="text-[11px] font-black text-emerald-900 uppercase tracking-[0.3em] mb-6 italic">QUYÊN GÓP CHUNG</h4>
           <div className="relative mx-auto w-40 h-40 bg-gray-50 rounded-[2.5rem] border-4 border-white shadow-inner flex items-center justify-center overflow-hidden mb-6">
              {globalQrUrl ? <img src={globalQrUrl} className="w-full h-full object-cover p-2" alt="QR" /> : <p className="text-[8px] text-gray-300 font-bold uppercase tracking-widest">Đang cập nhật...</p>}
           </div>
           {isAdmin && (
              <button onClick={() => qrInputRef.current?.click()} className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100">Đổi mã QR chung</button>
           )}
           <input ref={qrInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = async () => {
                const compressed = await compressImage(reader.result as string, 600, 0.9);
                await setDoc(doc(db, "settings", "donation_qr"), { url: compressed, updatedAt: new Date().toISOString() });
                onNotify('success', "Đã cập nhật mã QR mới!", "Hệ thống");
              };
              reader.readAsDataURL(file);
           }} />
        </div>
      </div>

      {/* MODAL CHI TIẾT SỨ MỆNH */}
      {selectedMission && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xl" onClick={closeModal}></div>
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="relative h-80 bg-emerald-900 flex-shrink-0">
              {aiVideoUrl ? (
                <video src={aiVideoUrl} autoPlay loop controls className="w-full h-full object-cover" />
              ) : (
                <img src={selectedMission.image || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200'} className="w-full h-full object-cover" alt="" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-black/10 to-transparent"></div>
              
              <div className="absolute top-8 right-8 flex gap-3 z-20">
                {!aiVideoUrl && (
                  <button 
                    onClick={handleGenerateAIPreview} 
                    disabled={isGeneratingVideo}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20 shadow-2xl flex items-center gap-2 hover:bg-emerald-500 transition-all disabled:opacity-50"
                  >
                    {isGeneratingVideo ? (
                      <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> AI ĐANG PHÁC HỌA...</>
                    ) : "✨ Tầm nhìn AI (Video)"}
                  </button>
                )}
                <button onClick={closeModal} className="bg-black/20 p-3 rounded-full text-white/70 hover:text-white transition-colors backdrop-blur-md border border-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="absolute bottom-10 left-12 text-white">
                 <h2 className="text-5xl font-black italic uppercase tracking-tighter drop-shadow-2xl">{selectedMission.location}</h2>
                 <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em] mt-2 italic drop-shadow-md">HÀNH TRÌNH NHÂN ÁI - {new Date(selectedMission.date).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
               {isGeneratingVideo && (
                 <div className="mb-8 p-6 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 flex items-center gap-4 animate-pulse">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-black">AI</div>
                    <p className="text-xs font-black text-emerald-800 uppercase tracking-widest italic">{aiVideoProgress}</p>
                 </div>
               )}

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-12">
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 flex items-center gap-2">
                           <span className="w-8 h-px bg-emerald-600"></span> Kế hoạch sứ mệnh
                        </h4>
                        <p className="text-lg text-gray-800 leading-relaxed italic font-medium">"{selectedMission.description}"</p>
                     </div>

                     <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 flex items-center gap-2">
                           <span className="w-8 h-px bg-emerald-600"></span> Nhu yếu phẩm cần kíp
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {selectedMission.itemsNeeded && selectedMission.itemsNeeded.length > 0 ? (
                             selectedMission.itemsNeeded.map((item, idx) => (
                               <div key={idx} className="p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col hover:bg-emerald-50 transition-all shadow-sm group">
                                  <div className="flex justify-between items-center mb-3">
                                     <span className="text-xs font-black text-gray-900 uppercase italic tracking-tighter">{item.name}</span>
                                     <span className="text-[9px] font-black text-emerald-600 uppercase bg-white px-3 py-1 rounded-full shadow-inner">{item.current}/{item.target} {item.unit}</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                     <div className="h-full bg-emerald-500 group-hover:bg-emerald-600 transition-colors" style={{ width: `${Math.min((item.current/item.target)*100, 100)}%` }}></div>
                                  </div>
                               </div>
                             ))
                           ) : (
                             <p className="text-[10px] italic text-gray-400 font-bold uppercase tracking-widest py-8">Đang cập nhật danh mục hiện vật...</p>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-10">
                     <div className="bg-white p-8 rounded-[3.5rem] shadow-xl border border-amber-50 text-center relative overflow-hidden">
                        <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-[0.3em] mb-6 italic">ỦNG HỘ CHIẾN DỊCH</h4>
                        <div className="relative mx-auto w-48 h-48 bg-gray-50 rounded-[2.5rem] border-4 border-white shadow-inner flex items-center justify-center overflow-hidden mb-6">
                           <img src={selectedMission.qrCode || globalQrUrl || 'https://placehold.co/400x400?text=No+QR'} className="w-full h-full object-cover p-2" alt="QR" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
