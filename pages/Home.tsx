
import React, { useState, useEffect, useRef } from 'react';
import { User, SocialPost, CharityMission, PostComment, PostMedia } from '../types';
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
  limit
} from "firebase/firestore";
import { db } from '../services/firebase';

interface HomeProps {
  user: User;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
  onViewProfile?: (userId: string) => void;
}

const PostMediaGrid: React.FC<{ media?: PostMedia[], mediaUrl?: string, mediaType?: 'image' | 'video' }> = ({ media, mediaUrl, mediaType }) => {
  const renderMediaItem = (item: PostMedia | {url: string, type: string}, index: number, className: string) => {
    // FIX: Kiểm tra URL rỗng
    const finalUrl = (item.url && item.url.trim() !== "") ? item.url : undefined;
    if (!finalUrl) return null;

    if (item.type === 'video') return <video key={index} src={finalUrl} controls className={`w-full h-full object-cover ${className}`} />;
    return <img key={index} src={finalUrl} className={`w-full h-full object-cover ${className}`} alt="" />;
  };

  if (media && media.length > 0) {
    const count = media.length;
    return (
      <div className={`grid gap-1 w-full max-h-[500px] overflow-hidden rounded-[1.5rem] my-3 shadow-md border border-gray-100 bg-gray-50
        ${count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2 aspect-video' : count === 3 ? 'grid-cols-2 grid-rows-2 aspect-square' : 'grid-cols-2 grid-rows-2 aspect-square'}`}>
        {count === 1 && <div className="w-full">{renderMediaItem(media[0], 0, "max-h-[500px]")}</div>}
        {count === 2 && <>{renderMediaItem(media[0], 0, "")}{renderMediaItem(media[1], 1, "")}</>}
        {count === 3 && <><div className="row-span-2 h-full">{renderMediaItem(media[0], 0, "")}</div>{renderMediaItem(media[1], 1, "")}{renderMediaItem(media[2], 2, "")}</>}
        {count >= 4 && <>{renderMediaItem(media[0], 0, "")}{renderMediaItem(media[1], 1, "")}{renderMediaItem(media[2], 2, "")}<div className="h-full relative">{renderMediaItem(media[3], 3, "")}{count > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-black text-xl">+{count - 4}</span></div>}</div></>}
      </div>
    );
  }

  // FIX: Chỉ render nếu mediaUrl không rỗng
  if (mediaUrl && mediaUrl.trim() !== "") {
    return (
      <div className="bg-gray-50 flex items-center justify-center border border-gray-100 rounded-[1.5rem] my-3 shadow-sm overflow-hidden">
        {mediaType === 'video' ? (
          <video src={mediaUrl} controls className="w-full max-h-[400px]" />
        ) : (
          <img src={mediaUrl} className="w-full h-auto object-contain max-h-[450px]" alt="" />
        )}
      </div>
    );
  }
  return null;
};

const Home: React.FC<HomeProps> = ({ user, onNotify, onViewProfile }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<CharityMission | null>(null);
  const [missionContributions, setMissionContributions] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<{ url: string, type: 'image' | 'video' }[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const getAvatar = (src?: string, name?: string) => {
    if (src && src.trim() !== "") return src;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=059669&color=fff&bold=true`;
  };

  const getMissionImg = (src?: string) => {
    if (src && src.trim() !== "") return src;
    return "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=800";
  };

  useEffect(() => {
    const qPosts = query(collection(db, "social_posts"), orderBy("createdAt", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPost)));
    });
    const qMissions = query(collection(db, "missions"), orderBy("createdAt", "desc"), limit(5));
    const unsubMissions = onSnapshot(qMissions, (snapshot) => {
      setMissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });
    return () => { unsubPosts(); unsubMissions(); };
  }, []);

  useEffect(() => {
    if (selectedMission) {
      const qContr = query(collection(db, "missions", selectedMission.id, "contributions"), orderBy("createdAt", "desc"));
      const unsubContr = onSnapshot(qContr, (snap) => {
        setMissionContributions(snap.docs.map(d => d.data()));
      });
      return () => unsubContr();
    }
  }, [selectedMission]);

  const handleReaction = async (post: SocialPost, type: 'likes' | 'hearts' | 'thanks') => {
    const postRef = doc(db, "social_posts", post.id);
    const list = (post as any)[type] || [];
    const hasReacted = list.includes(user.id);
    try {
      if (hasReacted) await updateDoc(postRef, { [type]: arrayRemove(user.id) });
      else await updateDoc(postRef, { [type]: arrayUnion(user.id) });
    } catch (err) { onNotify('error', "Lỗi tương tác."); }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;
    try {
      const postRef = doc(db, "social_posts", postId);
      const newComment: PostComment = {
        id: Math.random().toString(36).substr(2, 9),
        authorId: user.id,
        authorName: user.name,
        authorAvatar: getAvatar(user.avatar, user.name),
        text: commentText.trim(),
        createdAt: new Date().toISOString()
      };
      await updateDoc(postRef, { comments: arrayUnion(newComment) });
      setCommentText('');
    } catch (err) { onNotify('error', "Lỗi gửi bình luận."); }
  };

  const handlePost = async () => {
    if (!content.trim() && selectedFiles.length === 0) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "social_posts"), {
        authorId: user.id,
        authorName: user.name,
        authorAvatar: getAvatar(user.avatar, user.name),
        content: content.trim(),
        media: selectedFiles,
        likes: [], hearts: [], thanks: [], comments: [], sharesCount: 0,
        createdAt: new Date().toISOString()
      });
      setContent(''); setSelectedFiles([]); setIsPosting(false);
      onNotify('success', "Lan tỏa thành công!", 'Hệ thống');
    } catch (err) { onNotify('error', "Lỗi đăng bài."); } finally { setLoading(false); }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-2xl mx-auto flex flex-col gap-6 font-['Inter']">
      
      {missions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.3em] px-2">Hành trình yêu thương</h3>
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            {missions.map(m => (
              <div 
                key={m.id} 
                onClick={() => setSelectedMission(m)}
                className="flex-shrink-0 w-80 bg-emerald-900 rounded-[2.5rem] overflow-hidden shadow-xl relative group cursor-pointer transition-all hover:-translate-y-1"
              >
                <img src={getMissionImg(m.image)} className="w-full h-48 object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" alt="" />
                <div className="absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-emerald-950 via-transparent to-transparent">
                  <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-3 py-1 rounded-full w-fit mb-2 shadow-lg tracking-widest uppercase italic">Ghi dấu tri ân</span>
                  <h4 className="text-xl font-black text-white italic uppercase tracking-tighter leading-tight">{m.location}</h4>
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-emerald-400" style={{width: `${Math.min(100, (m.currentBudget / m.targetBudget) * 100)}%`}}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm p-4 border border-gray-100">
        <div className="flex items-center space-x-3">
          <img src={getAvatar(user.avatar, user.name)} className="w-10 h-10 rounded-full object-cover shadow-sm cursor-pointer border border-gray-100" alt="" onClick={() => onViewProfile?.(user.id)} />
          <button onClick={() => setIsPosting(true)} className="flex-1 bg-gray-50 hover:bg-emerald-50 text-gray-400 text-left px-6 py-3 rounded-full text-xs font-medium transition-all italic border border-transparent hover:border-emerald-100">
            Đệ ơi, có điều gì muốn lan tỏa hôm nay?
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] px-2 text-center italic">Cộng đồng sẻ chia</h3>
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col group transition-all">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src={getAvatar(post.authorAvatar, post.authorName)} className="w-10 h-10 rounded-2xl object-cover border border-gray-50 shadow-sm cursor-pointer" alt="" onClick={() => onViewProfile?.(post.authorId)} />
                <div><h4 className="font-black text-sm text-gray-900 uppercase italic tracking-tighter cursor-pointer hover:text-emerald-700">{post.authorName}</h4><p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p></div>
              </div>
            </div>
            <div className="px-8 pb-4"><p className="text-sm text-gray-800 leading-relaxed font-medium italic">"{post.content}"</p></div>
            <div className="px-4"><PostMediaGrid media={post.media} mediaUrl={post.mediaUrl} mediaType={post.mediaType} /></div>
            <div className="p-2 flex items-center border-b border-gray-50 space-x-1">
               <button onClick={() => handleReaction(post, 'likes')} className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${post.likes.includes(user.id) ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:bg-gray-50'}`}><span className="text-base">👍</span><span className="text-[7px] font-black uppercase mt-1">{post.likes.length} Thích</span></button>
               <button onClick={() => handleReaction(post, 'hearts')} className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${post.hearts?.includes(user.id) ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-50'}`}><span className="text-base">❤️</span><span className="text-[7px] font-black uppercase mt-1">{(post.hearts || []).length} Thương</span></button>
               <button onClick={() => setActiveCommentId(activeCommentId === post.id ? null : post.id)} className="flex-1 flex flex-col items-center py-2 rounded-xl text-gray-400 hover:bg-gray-50 transition-all"><span className="text-base">💬</span><span className="text-[7px] font-black uppercase mt-1">{post.comments?.length || 0} Nhắn gửi</span></button>
            </div>
          </div>
        ))}
      </div>

      {selectedMission && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-2xl" onClick={() => setSelectedMission(null)}></div>
          <div className="relative bg-white w-full max-w-6xl h-[90vh] rounded-[4rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white border-r border-gray-100">
               <h2 className="text-5xl font-black italic uppercase text-emerald-950 tracking-tighter leading-none mb-4">{selectedMission.location}</h2>
               <p className="text-gray-500 text-sm italic font-medium mb-10">"{selectedMission.description}"</p>
               
               <div className="space-y-8">
                  <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.3em] border-b pb-2">Danh sách nhu yếu phẩm</h3>
                  <div className="grid grid-cols-1 gap-4">
                     {selectedMission.itemsNeeded.map((item, idx) => (
                       <div key={idx} className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100">
                          <div className="flex justify-between items-end mb-3">
                             <p className="font-black text-xs uppercase italic text-emerald-900">{item.name}</p>
                             <p className="text-[10px] font-black text-emerald-600">{item.current}/{item.target} {item.unit}</p>
                          </div>
                          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-400" style={{width: `${Math.min(100, (item.current / item.target) * 100)}%`}}></div>
                          </div>
                       </div>
                     ))}
                  </div>

                  <div className="bg-emerald-900 p-8 rounded-[3rem] text-white flex justify-between items-center shadow-2xl">
                     <div><p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Ngân sách hiện có</p><p className="text-3xl font-black italic">{(selectedMission.currentBudget || 0).toLocaleString()} VNĐ</p></div>
                     <div className="text-right"><p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Mục tiêu</p><p className="text-lg font-black text-emerald-100">{(selectedMission.targetBudget).toLocaleString()}đ</p></div>
                  </div>
               </div>
            </div>

            <div className="w-full md:w-[450px] bg-emerald-50/50 p-8 md:p-12 flex flex-col overflow-y-auto custom-scrollbar">
               <div className="text-center mb-10">
                  <h3 className="text-[11px] font-black uppercase text-emerald-800 tracking-[0.3em] mb-6 italic">Quét mã Ghi danh</h3>
                  <div className="bg-white p-6 rounded-[3.5rem] shadow-xl inline-block border-2 border-emerald-100">
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=DONATE_${selectedMission.id}`} className="w-44 h-44 object-contain" alt="" />
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-4">Mọi sẻ chia đều là món quà quý giá</p>
               </div>

               <div className="flex-1">
                  <h3 className="text-[12px] font-black uppercase text-emerald-900 tracking-[0.2em] mb-6 border-b-2 border-emerald-100 pb-2 italic">Bảng Vàng Chiến Dịch</h3>
                  <div className="space-y-4">
                     {missionContributions.length > 0 ? missionContributions.map((c, i) => (
                       <div key={i} className="bg-white p-5 rounded-[2.5rem] shadow-md border border-emerald-100 flex items-center gap-5 hover:scale-105 transition-transform animate-in slide-in-from-right" style={{animationDelay: `${i * 0.1}s`}}>
                          <img src={getAvatar(c.donorAvatar, c.donorName)} className="w-14 h-14 rounded-2xl object-cover shadow-sm" alt="" />
                          <div className="min-w-0">
                             <p className="font-black text-xs text-emerald-950 uppercase italic tracking-tighter truncate">{c.donorName}</p>
                             <div className="flex flex-wrap gap-1 mt-1">
                                {c.amount > 0 && <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full">+{(c.amount/1000).toLocaleString()}kđ</span>}
                                {c.items && <span className="bg-amber-50 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded-full">📦 {c.items}</span>}
                             </div>
                             {c.message && <p className="text-[7px] text-gray-400 italic mt-1 truncate">"{c.message}"</p>}
                          </div>
                       </div>
                     )) : (
                       <div className="py-20 flex flex-col items-center justify-center opacity-30 text-center italic">
                          <p className="text-[10px] font-black uppercase tracking-widest">Đang chờ những tấm lòng đầu tiên...</p>
                       </div>
                     )}
                  </div>
               </div>

               <button onClick={() => setSelectedMission(null)} className="mt-10 w-full bg-emerald-950 text-white py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl">Đóng chi tiết</button>
            </div>
          </div>
        </div>
      )}

      {isPosting && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 overflow-y-auto py-10">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md" onClick={() => setIsPosting(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-black italic uppercase text-emerald-900 mb-6 tracking-tighter">Lan tỏa yêu thương</h3>
            <textarea className="w-full bg-gray-50 p-6 rounded-[2rem] font-medium outline-none border-2 border-transparent focus:border-emerald-500 transition-all mb-4 text-sm text-gray-700 italic" rows={4} placeholder="Chia sẻ niềm vui hôm nay..." value={content} onChange={(e) => setContent(e.target.value)} />
            <div className="flex gap-3">
               <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>Thêm Media</span></button>
               <button onClick={handlePost} disabled={loading} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.1em] text-[10px] shadow-xl hover:bg-emerald-700 transition-all">{loading ? 'Đang đăng...' : 'LAN TỎA NGAY'}</button>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,video/*" />
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Home;
