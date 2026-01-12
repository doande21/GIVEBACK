
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

interface DonationLog {
  id: string;
  donorName: string;
  amount: number;
  message: string;
  createdAt: string;
}

const PostMediaGrid: React.FC<{ media: PostMedia[] }> = ({ media }) => {
  if (!media || media.length === 0) return null;

  const renderMediaItem = (item: PostMedia, index: number, className: string) => {
    if (item.type === 'video') {
      return (
        <video key={index} src={item.url} controls className={`w-full h-full object-cover ${className}`} />
      );
    }
    return (
      <img key={index} src={item.url} className={`w-full h-full object-cover ${className}`} alt="" />
    );
  };

  const count = media.length;
  
  return (
    <div className={`grid gap-1 w-full max-h-[500px] overflow-hidden rounded-[1.5rem] my-3 shadow-md border border-gray-100 bg-gray-50
      ${count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2 aspect-video' : count === 3 ? 'grid-cols-2 grid-rows-2 aspect-square' : 'grid-cols-2 grid-rows-2 aspect-square'}`}>
      
      {count === 1 && <div className="w-full">{renderMediaItem(media[0], 0, "max-h-[500px]")}</div>}
      
      {count === 2 && (
        <>
          <div className="h-full">{renderMediaItem(media[0], 0, "")}</div>
          <div className="h-full">{renderMediaItem(media[1], 1, "")}</div>
        </>
      )}

      {count === 3 && (
        <>
          <div className="row-span-2 h-full">{renderMediaItem(media[0], 0, "")}</div>
          <div className="h-full">{renderMediaItem(media[1], 1, "")}</div>
          <div className="h-full">{renderMediaItem(media[2], 2, "")}</div>
        </>
      )}

      {count >= 4 && (
        <>
          <div className="h-full">{renderMediaItem(media[0], 0, "")}</div>
          <div className="h-full">{renderMediaItem(media[1], 1, "")}</div>
          <div className="h-full">{renderMediaItem(media[2], 2, "")}</div>
          <div className="h-full relative">
            {renderMediaItem(media[3], 3, "")}
            {count > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-black text-xl">+{count - 4}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const Home: React.FC<HomeProps> = ({ user, onNotify, onViewProfile }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<CharityMission | null>(null);
  const [donationLogs, setDonationLogs] = useState<DonationLog[]>([]);
  
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

  useEffect(() => {
    const qPosts = query(collection(db, "social_posts"), orderBy("createdAt", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPost)));
    });

    const qMissions = query(collection(db, "missions"), orderBy("createdAt", "desc"), limit(10));
    const unsubMissions = onSnapshot(qMissions, (snapshot) => {
      setMissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });

    return () => { unsubPosts(); unsubMissions(); };
  }, []);

  useEffect(() => {
    if (selectedMission) {
      const qLogs = query(
        collection(db, "missions", selectedMission.id, "donations"), 
        orderBy("createdAt", "desc"), 
        limit(10)
      );
      const unsubLogs = onSnapshot(qLogs, (snapshot) => {
        setDonationLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationLog)));
      });
      return () => unsubLogs();
    }
  }, [selectedMission]);

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleReaction = async (post: SocialPost, type: 'likes' | 'hearts' | 'thanks') => {
    const postRef = doc(db, "social_posts", post.id);
    const list = (post as any)[type] || [];
    const hasReacted = list.includes(user.id);
    try {
      if (hasReacted) { await updateDoc(postRef, { [type]: arrayRemove(user.id) }); }
      else { await updateDoc(postRef, { [type]: arrayUnion(user.id) }); }
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
      onNotify('success', "Đã gửi lời động viên!", "GIVEBACK");
    } catch (err) { onNotify('error', "Lỗi gửi bình luận."); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles: { url: string, type: 'image' | 'video' }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        const reader = new FileReader();
        const promise = new Promise<{ url: string, type: 'image' | 'video' }>((resolve) => {
          reader.onloadend = async () => {
            let url = reader.result as string;
            if (!isVideo) {
              url = await compressImage(url);
            }
            resolve({ url, type: isVideo ? 'video' : 'image' });
          };
          reader.readAsDataURL(file);
        });
        newFiles.push(await promise);
      }
      setSelectedFiles(prev => [...prev, ...newFiles].slice(0, 10)); // Giới hạn 10 tệp
    }
  };

  const handlePost = async () => {
    if (!content.trim() && selectedFiles.length === 0) return;
    setLoading(true);
    try {
      const newPostData = {
        authorId: user.id,
        authorName: user.name,
        authorAvatar: getAvatar(user.avatar, user.name),
        content: content.trim(),
        media: selectedFiles,
        likes: [],
        hearts: [],
        thanks: [],
        comments: [],
        sharesCount: 0,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "social_posts"), newPostData);
      setContent(''); setSelectedFiles([]); setIsPosting(false);
      onNotify('success', "Lan tỏa thành công!", 'Hệ thống');
    } catch (err) { 
      onNotify('error', "Lỗi đăng bài. Hãy thử lại!", 'Hệ thống'); 
    } finally { setLoading(false); }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-2xl mx-auto flex flex-col gap-6 font-['Inter']">
      
      {/* Create Post Input Area */}
      <div className="bg-white rounded-[2rem] shadow-sm p-4 border border-gray-100">
        <div className="flex items-center space-x-3">
          <img 
            src={getAvatar(user.avatar, user.name)} 
            className="w-10 h-10 rounded-full object-cover shadow-sm cursor-pointer border border-gray-100" 
            alt="" 
            onClick={() => onViewProfile?.(user.id)}
          />
          <button 
            onClick={() => setIsPosting(true)}
            className="flex-1 bg-gray-50 hover:bg-emerald-50 text-gray-400 text-left px-6 py-3 rounded-full text-xs font-medium transition-all italic border border-transparent hover:border-emerald-100"
          >
            Đệ ơi, có điều gì muốn lan tỏa hôm nay?
          </button>
        </div>
      </div>

      {/* Main Social Feed */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] px-2">Cộng đồng sẻ chia</h3>
        
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col group transition-all">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src={getAvatar(post.authorAvatar, post.authorName)} 
                  className="w-10 h-10 rounded-2xl object-cover border border-gray-50 shadow-sm cursor-pointer hover:scale-105 transition-transform" 
                  alt="" 
                  onClick={() => onViewProfile?.(post.authorId)}
                />
                <div>
                  <h4 
                    className="font-black text-sm text-gray-900 uppercase italic tracking-tighter flex items-center cursor-pointer hover:text-emerald-700"
                    onClick={() => onViewProfile?.(post.authorId)}
                  >
                    {post.authorName}
                  </h4>
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            </div>
            
            <div className="px-8 pb-4">
              <p className="text-sm text-gray-800 leading-relaxed font-medium italic">"{post.content}"</p>
            </div>

            {/* Media Display - Grid Layout */}
            <div className="px-4">
              {post.media && post.media.length > 0 ? (
                <PostMediaGrid media={post.media} />
              ) : post.mediaUrl ? (
                // Backward compatibility for old posts
                <div className="bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 rounded-[1.5rem] my-3 shadow-sm">
                   {post.mediaType === 'video' ? (
                    <video src={post.mediaUrl} controls className="w-full max-h-[450px]" />
                  ) : (
                    <img src={post.mediaUrl} className="w-full h-auto object-contain max-h-[500px]" alt="" />
                  )}
                </div>
              ) : null}
            </div>

            <div className="p-2 flex items-center border-b border-gray-50 space-x-1">
              <button onClick={() => handleReaction(post, 'likes')} className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${post.likes.includes(user.id) ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                <span className="text-base">👍</span>
                <span className="text-[7px] font-black uppercase mt-1">{post.likes.length} Thích</span>
              </button>
              <button onClick={() => handleReaction(post, 'hearts')} className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${post.hearts?.includes(user.id) ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                <span className="text-base">❤️</span>
                <span className="text-[7px] font-black uppercase mt-1">{(post.hearts || []).length} Thương</span>
              </button>
              <button onClick={() => handleReaction(post, 'thanks')} className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${post.thanks?.includes(user.id) ? 'bg-amber-50 text-amber-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                <span className="text-base">🙌</span>
                <span className="text-[7px] font-black uppercase mt-1">{(post.thanks || []).length} Biết ơn</span>
              </button>
              <button onClick={() => setActiveCommentId(activeCommentId === post.id ? null : post.id)} className="flex-1 flex flex-col items-center py-2 rounded-xl text-gray-400 hover:bg-gray-50 transition-all">
                <span className="text-base">💬</span>
                <span className="text-[7px] font-black uppercase mt-1">{post.comments?.length || 0} Nhắn gửi</span>
              </button>
            </div>

            {activeCommentId === post.id && (
              <div className="bg-gray-50/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {post.comments?.map(comment => (
                    <div key={comment.id} className="flex space-x-3">
                      <img 
                        src={getAvatar(comment.authorAvatar, comment.authorName)} 
                        className="w-8 h-8 rounded-xl object-cover shadow-sm cursor-pointer hover:scale-110 transition-transform" 
                        alt="" 
                        onClick={() => onViewProfile?.(comment.authorId)}
                      />
                      <div className="flex-1 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-0.5">
                          <p 
                            className="text-[9px] font-black uppercase italic text-gray-900 tracking-tighter cursor-pointer hover:text-emerald-700"
                            onClick={() => onViewProfile?.(comment.authorId)}
                          >
                            {comment.authorName}
                          </p>
                          <p className="text-[7px] text-gray-400 font-bold">{new Date(comment.createdAt).toLocaleDateString()}</p>
                        </div>
                        <p className="text-[11px] text-gray-700 italic leading-relaxed">"{comment.text}"</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                    placeholder="Gửi lời động viên..."
                    className="flex-1 bg-white border border-gray-100 rounded-xl px-5 py-2.5 text-xs font-bold outline-none focus:border-emerald-500 shadow-inner"
                  />
                  <button onClick={() => handleAddComment(post.id)} className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isPosting && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 overflow-y-auto py-10">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md" onClick={() => setIsPosting(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-black italic uppercase text-emerald-900 mb-6 tracking-tighter">Đệ đang muốn lan tỏa điều gì?</h3>
            <textarea 
              className="w-full bg-gray-50 p-6 rounded-[2rem] font-medium outline-none border-2 border-transparent focus:border-emerald-500 transition-all mb-4 text-base text-gray-700 italic"
              rows={4}
              placeholder="Chia sẻ niềm vui hôm nay..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            
            {selectedFiles.length > 0 && (
               <div className="mb-4 grid grid-cols-3 gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative aspect-square bg-black rounded-xl overflow-hidden border border-gray-100">
                      {file.type === 'video' ? (
                        <video src={file.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={file.url} className="w-full h-full object-cover" alt="" />
                      )}
                      <button 
                        onClick={() => removeFile(idx)} 
                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
               </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span>Thêm Media ({selectedFiles.length}/10)</span>
              </button>
              <button 
                onClick={handlePost} 
                disabled={loading || (content.trim() === '' && selectedFiles.length === 0)}
                className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.1em] text-[10px] shadow-xl disabled:opacity-50 hover:bg-emerald-700 transition-all"
              >
                {loading ? 'ĐANG ĐĂNG...' : 'LAN TỎA NGAY'}
              </button>
            </div>
            <input 
              ref={fileInputRef} 
              type="file" 
              className="hidden" 
              multiple 
              accept="image/*,video/*" 
              onChange={handleFileChange} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
