
import React, { useState, useEffect, useRef } from 'react';
import { User, SocialPost, CharityMission } from '../types';
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
}

const Home: React.FC<HomeProps> = ({ user }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Lấy bài đăng social
    const qPosts = query(collection(db, "social_posts"), orderBy("createdAt", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPost)));
    });

    // Lấy các chuyến cứu trợ mới nhất từ Admin
    const qMissions = query(collection(db, "missions"), orderBy("createdAt", "desc"), limit(5));
    const unsubMissions = onSnapshot(qMissions, (snapshot) => {
      setMissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });

    return () => {
      unsubPosts();
      unsubMissions();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      const reader = new FileReader();
      reader.onloadend = () => setMediaFile(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !mediaFile) return;
    setLoading(true);
    try {
      const newPostData = {
        authorId: user.id,
        authorName: user.name,
        authorAvatar: user.avatar || '',
        content: content.trim(),
        mediaUrl: mediaFile,
        mediaType: mediaType,
        likes: [],
        commentsCount: 0,
        sharesCount: 0,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "social_posts"), newPostData);
      setContent('');
      setMediaFile(null);
      setIsPosting(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (post: SocialPost) => {
    const postRef = doc(db, "social_posts", post.id);
    const isLiked = post.likes.includes(user.id);
    if (isLiked) {
      await updateDoc(postRef, { likes: arrayRemove(user.id) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(user.id) });
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-2xl mx-auto flex flex-col gap-6">
      
      {/* Official Missions Section (Carousel-like) */}
      {missions.length > 0 && (
        <div className="space-y-4 mb-2">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-900">Kế hoạch cứu trợ từ GIVEBACK</h2>
            <div className="h-px flex-1 bg-emerald-100 ml-4"></div>
          </div>
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            {missions.map(mission => (
              <div 
                key={mission.id} 
                className="flex-shrink-0 w-72 bg-white rounded-[2rem] shadow-sm border border-emerald-50 overflow-hidden group hover:shadow-xl transition-all"
              >
                <div className="relative h-32">
                  <img src={mission.image} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute top-3 left-3 bg-emerald-600 text-[8px] font-black text-white px-2 py-1 rounded-full uppercase tracking-widest">Chính thức</div>
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="text-[8px] font-bold uppercase tracking-widest opacity-80">{new Date(mission.date).toLocaleDateString('vi-VN')}</p>
                    <p className="text-xs font-black uppercase italic truncate w-60">{mission.location}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] text-gray-500 line-clamp-2 italic mb-3">"{mission.description}"</p>
                  <button className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[8px] font-black uppercase tracking-widest group-hover:bg-emerald-600 group-hover:text-white transition-all">Chi tiết kế hoạch</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Post Area */}
      <div className="bg-white rounded-[1.5rem] shadow-sm p-4 border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <img src={user.avatar} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="" />
          <button 
            onClick={() => setIsPosting(true)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 text-left px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
          >
            {user.name.split(' ').pop()} ơi, bạn đang nghĩ gì thế?
          </button>
        </div>
        <div className="border-t pt-2 flex items-center justify-between px-2">
          <button onClick={() => { setIsPosting(true); fileInputRef.current?.click(); }} className="flex items-center space-x-2 py-2 text-emerald-600 font-bold text-xs uppercase tracking-tighter">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>Ảnh/Video</span>
          </button>
          <div className="w-px h-6 bg-gray-100"></div>
          <button className="flex items-center space-x-2 py-2 text-red-500 font-bold text-xs uppercase tracking-tighter">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Cảm xúc</span>
          </button>
        </div>
      </div>

      {/* Social Feed */}
      <div className="space-y-6">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src={post.authorAvatar} className="w-10 h-10 rounded-full border border-gray-50 object-cover" alt="" />
                <div>
                  <h4 className="font-bold text-sm text-gray-900 leading-none mb-1">{post.authorName}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString('vi-VN')} &bull; GIVEBACK</p>
                </div>
              </div>
              <button className="text-gray-400 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg></button>
            </div>

            {/* Content */}
            <div className="px-4 pb-4">
              <p className="text-sm text-gray-800 leading-relaxed italic">{post.content}</p>
            </div>

            {/* Media */}
            {post.mediaUrl && (
              <div className="relative bg-black max-h-[500px] flex items-center justify-center overflow-hidden">
                {post.mediaType === 'video' ? (
                  <video src={post.mediaUrl} controls className="w-full h-auto" />
                ) : (
                  <img src={post.mediaUrl} className="w-full h-auto object-contain" alt="" />
                )}
              </div>
            )}

            {/* Interaction Bar */}
            <div className="px-4 py-2 border-t border-b flex items-center justify-between text-gray-500 text-xs">
              <div className="flex items-center space-x-1">
                <span className="bg-emerald-100 text-emerald-600 p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg></span>
                <span className="font-bold">{post.likes.length} yêu thích</span>
              </div>
              <div className="space-x-4">
                <span className="font-bold">{post.commentsCount} bình luận</span>
                <span className="font-bold">{post.sharesCount} chia sẻ</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-2 flex items-center justify-between">
              <button 
                onClick={() => handleLike(post)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl transition-colors ${post.likes.includes(user.id) ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 hover:bg-gray-50'} font-black text-[10px] uppercase tracking-widest`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={post.likes.includes(user.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                <span>Yêu thích</span>
              </button>
              <button className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-500 font-black text-[10px] uppercase tracking-widest">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <span>Bình luận</span>
              </button>
              <button className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-500 font-black text-[10px] uppercase tracking-widest">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-5.368 3 3 0 000 5.368zm0 9.474a3 3 0 100 5.368 3 3 0 000-5.368z" /></svg>
                <span>Chia sẻ</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Post Modal */}
      {isPosting && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setIsPosting(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b text-center relative">
              <h2 className="text-sm font-black uppercase tracking-widest">Tạo bài viết</h2>
              <button onClick={() => setIsPosting(false)} className="absolute right-4 top-4 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-4 flex items-center space-x-3 mb-2">
              <img src={user.avatar} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="" />
              <div>
                <h4 className="font-bold text-sm text-gray-900 leading-none">{user.name}</h4>
                <div className="mt-1 bg-gray-100 px-2 py-0.5 rounded-md flex items-center space-x-1 w-fit">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.523 5 10 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                   <span className="text-[10px] font-bold text-gray-500 uppercase">Công khai</span>
                </div>
              </div>
            </div>
            <div className="p-4 pt-0">
              <textarea 
                rows={5} 
                className="w-full text-lg font-medium outline-none resize-none placeholder-gray-300" 
                placeholder={`${user.name.split(' ').pop()} ơi, hãy chia sẻ điều gì đó nhân văn nhé...`}
                value={content}
                onChange={e => setContent(e.target.value)}
              />
              
              {mediaFile && (
                <div className="mt-4 relative rounded-xl overflow-hidden border border-gray-100">
                  <button onClick={() => setMediaFile(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  {mediaType === 'video' ? <video src={mediaFile} className="w-full max-h-60 object-cover" /> : <img src={mediaFile} className="w-full max-h-60 object-cover" alt="" />}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center space-x-2"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 <span className="text-[10px] font-black uppercase tracking-widest">Thêm ảnh / video của bạn</span>
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
              
              <button 
                disabled={loading || (!content.trim() && !mediaFile)}
                onClick={handlePost}
                className="w-full mt-4 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 disabled:opacity-50 active:scale-95 transition-all"
              >
                {loading ? 'Đang đăng bài...' : 'Đăng ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
