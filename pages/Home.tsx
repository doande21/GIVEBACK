
import React, { useState, useEffect, useRef } from 'react';
import { User, SocialPost, CharityMission, DonationLog } from '../types';
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
  // Add onNotify prop to match App.tsx usage
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
}

const Home: React.FC<HomeProps> = ({ user, onNotify }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<CharityMission | null>(null);
  const [donationLogs, setDonationLogs] = useState<DonationLog[]>([]);
  const [donationAmount, setDonationAmount] = useState<number>(100000);
  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qPosts = query(collection(db, "social_posts"), orderBy("createdAt", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPost)));
    });

    const qMissions = query(collection(db, "missions"), orderBy("createdAt", "desc"), limit(5));
    const unsubMissions = onSnapshot(qMissions, (snapshot) => {
      setMissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });

    return () => {
      unsubPosts();
      unsubMissions();
    };
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

  const handleLike = async (post: SocialPost) => {
    const postRef = doc(db, "social_posts", post.id);
    const isLiked = post.likes.includes(user.id);
    try {
      if (isLiked) {
        await updateDoc(postRef, { likes: arrayRemove(user.id) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(user.id) });
      }
    } catch (err) {
      console.error(err);
      onNotify('error', "Không thể thực hiện lượt thích.", 'Hệ thống');
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
      onNotify('success', "Bài viết của bạn đã được đăng thành công!", 'Hệ thống');
    } catch (err) {
      console.error(err);
      onNotify('error', "Có lỗi xảy ra khi đăng bài.", 'Hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      const reader = new FileReader();
      reader.onloadend = () => setMediaFile(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-2xl mx-auto flex flex-col gap-6">
      
      {missions.length > 0 && (
        <div className="space-y-4 mb-2">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-900">Kế hoạch cứu trợ từ GIVEBACK</h2>
            <div className="h-px flex-1 bg-emerald-100 ml-4"></div>
          </div>
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            {missions.map(mission => {
              const currentBudget = mission.currentBudget ?? 0;
              const targetBudget = mission.targetBudget ?? 1;
              const progress = Math.min(100, Math.round((currentBudget / targetBudget) * 100));

              return (
                <div 
                  key={mission.id} 
                  onClick={() => setSelectedMission(mission)}
                  className="flex-shrink-0 w-72 bg-white rounded-[2rem] shadow-sm border border-emerald-50 overflow-hidden group hover:shadow-xl transition-all cursor-pointer"
                >
                  <div className="relative h-32 bg-gray-100">
                    {mission.image && <img src={mission.image} className="w-full h-full object-cover" alt="" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute top-3 left-3 bg-emerald-600 text-[8px] font-black text-white px-2 py-1 rounded-full uppercase tracking-widest">Chính thức</div>
                    <div className="absolute bottom-3 left-3 text-white">
                      <p className="text-[8px] font-bold uppercase tracking-widest opacity-80">{new Date(mission.date).toLocaleDateString('vi-VN')}</p>
                      <p className="text-xs font-black uppercase italic truncate w-60">{mission.location}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[9px] font-black text-emerald-600 uppercase">Tiến độ quỹ:</p>
                      <p className="text-[9px] font-black text-gray-400 uppercase">{progress}%</p>
                    </div>
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    <button className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[8px] font-black uppercase tracking-widest group-hover:bg-emerald-600 group-hover:text-white transition-all">Chi tiết kế hoạch</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Input area for new posts */}
      {isPosting && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPosting(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-black italic uppercase text-emerald-900 mb-6">Chia sẻ khoảnh khắc thiện nguyện</h3>
            <textarea 
              className="w-full bg-gray-50 p-5 rounded-3xl font-medium outline-none border-2 border-transparent focus:border-emerald-500 transition-all mb-4"
              rows={4}
              placeholder="Bạn đang nghĩ gì thế?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            
            {mediaFile && (
              <div className="relative rounded-2xl overflow-hidden mb-4 aspect-video bg-black flex items-center justify-center">
                {mediaType === 'video' ? <video src={mediaFile} className="h-full w-auto" /> : <img src={mediaFile} className="h-full w-auto object-contain" alt="" />}
                <button onClick={() => setMediaFile(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => setIsPosting(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Hủy</button>
              <button 
                onClick={handlePost} 
                disabled={loading || (!content.trim() && !mediaFile)}
                className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 disabled:opacity-50"
              >
                {loading ? 'Đang đăng...' : 'Đăng ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[1.5rem] shadow-sm p-4 border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          {user.avatar && <img src={user.avatar} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="" />}
          {!user.avatar && <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">{user.name.charAt(0)}</div>}
          <button 
            onClick={() => setIsPosting(true)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 text-left px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
          >
            Chào bạn, bạn đang nghĩ gì thế?
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

      <div className="space-y-6">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {post.authorAvatar ? (
                  <img src={post.authorAvatar} className="w-10 h-10 rounded-full border border-gray-50 object-cover" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold">{post.authorName.charAt(0)}</div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-gray-900 leading-none mb-1">{post.authorName}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString('vi-VN')} &bull; GIVEBACK</p>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4">
              <p className="text-sm text-gray-800 leading-relaxed italic">{post.content}</p>
            </div>
            {post.mediaUrl && (
              <div className="relative bg-black max-h-[500px] flex items-center justify-center overflow-hidden">
                {post.mediaType === 'video' ? (
                  <video src={post.mediaUrl} controls className="w-full h-auto" />
                ) : (
                  <img src={post.mediaUrl} className="w-full h-auto object-contain" alt="" />
                )}
              </div>
            )}
            <div className="p-2 flex items-center justify-between">
              <button onClick={() => handleLike(post)} className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl transition-colors ${post.likes.includes(user.id) ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 hover:bg-gray-50'} font-black text-[10px] uppercase tracking-widest`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={post.likes.includes(user.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                <span>Yêu thích</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedMission && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 overflow-y-auto py-8">
          <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-md" onClick={() => setSelectedMission(null)}></div>
          <div className="relative bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[95vh]">
             <button onClick={() => setSelectedMission(null)} className="absolute top-6 right-6 z-20 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>

             <div className="h-64 md:h-80 relative bg-gray-900">
                {selectedMission.image && <img src={selectedMission.image} className="w-full h-full object-cover" alt="" />}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-transparent to-transparent"></div>
                <div className="absolute bottom-8 left-8 right-8">
                  <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl mb-2 inline-block">Chi tiết kế hoạch minh bạch</span>
                  <h2 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none">{selectedMission.location}</h2>
                </div>
             </div>

             <div className="p-8 md:p-12 overflow-y-auto bg-gray-50/30">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                   
                   <div className="lg:col-span-2 space-y-12">
                      {/* Section: Ngân quỹ */}
                      <div>
                        <div className="flex justify-between items-end mb-4">
                          <h4 className="text-[10px] font-black uppercase text-emerald-900 tracking-[0.3em]">Tiến độ tài chính chuyến đi</h4>
                          <p className="text-emerald-600 font-black italic text-xl">{((selectedMission.currentBudget ?? 0) / 1000000).toFixed(1)}Tr / {((selectedMission.targetBudget ?? 0) / 1000000).toFixed(0)}Tr VNĐ</p>
                        </div>
                        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner flex">
                           <div 
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000"
                              style={{ width: `${selectedMission.targetBudget > 0 ? Math.min(100, ((selectedMission.currentBudget ?? 0) / selectedMission.targetBudget) * 100) : 0}%` }}
                           ></div>
                        </div>
                      </div>

                      {/* Section: Nhu yếu phẩm (Tính năng mới) */}
                      {selectedMission.itemsNeeded && selectedMission.itemsNeeded.length > 0 && (
                        <div className="bg-white p-8 rounded-[3rem] border border-emerald-50 shadow-sm">
                           <h4 className="text-[10px] font-black uppercase text-emerald-900 tracking-[0.3em] mb-8">Danh mục nhu yếu phẩm cần quyên góp</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {selectedMission.itemsNeeded.map((item, idx) => {
                                const itemProgress = item.target > 0 ? Math.min(100, Math.round((item.current / item.target) * 100)) : 0;
                                return (
                                  <div key={idx} className="space-y-3">
                                     <div className="flex justify-between items-end">
                                        <p className="text-sm font-black text-gray-900 uppercase italic">{item.name}</p>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">{item.current}/{item.target} {item.unit}</p>
                                     </div>
                                     <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all duration-1000 ${itemProgress >= 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                                          style={{ width: `${itemProgress}%` }}
                                        ></div>
                                     </div>
                                  </div>
                                );
                              })}
                           </div>
                        </div>
                      )}

                      <div className="prose prose-emerald max-w-none">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mb-4">Hoàn cảnh vùng khó khăn</h4>
                        <p className="text-gray-600 leading-relaxed italic text-lg">"{selectedMission.description}"</p>
                      </div>

                      <div className="bg-white p-8 rounded-[3rem] border border-emerald-50 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                           <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Bảng vàng minh bạch tiền mặt</h4>
                           <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black uppercase">Thời gian thực</span>
                        </div>
                        <div className="space-y-4">
                           {donationLogs.length > 0 ? donationLogs.map((log) => (
                             <div key={log.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 group">
                                <div className="flex items-center space-x-3">
                                   <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-black text-emerald-700 text-[10px] group-hover:scale-110 transition-transform">
                                      {log.donorName.charAt(0)}
                                   </div>
                                   <div>
                                      <p className="text-[11px] font-black text-gray-900 uppercase">{log.donorName}</p>
                                      <p className="text-[9px] text-gray-400 italic">"{log.message || 'Chung tay xây dựng cộng đồng'}"</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-sm font-black text-emerald-600">{(log.amount ?? 0).toLocaleString()}đ</p>
                                   <p className="text-[8px] text-gray-300 font-bold uppercase">{new Date(log.createdAt).toLocaleDateString('vi-VN')}</p>
                                </div>
                             </div>
                           )) : (
                             <p className="text-center text-[10px] text-gray-400 font-bold italic py-8">Đang đợi những tấm lòng vàng đầu tiên...</p>
                           )}
                        </div>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div className="bg-emerald-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                         <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 text-emerald-200 text-center relative z-10">Quyên góp trực tiếp</h4>
                         
                         <div className="bg-white p-4 rounded-3xl mb-8 relative z-10 shadow-inner group">
                            <img 
                              src={`https://api.vietqr.io/image/970415-11336699-2Gf8E7C.jpg?accountName=GIVEBACK%20COMMUNITY&amount=${donationAmount}&addInfo=GB%20${selectedMission.location.replace(/ /g, '%20')}`} 
                              className="w-full h-auto transition-transform duration-500" 
                              alt="QR Quyên góp" 
                            />
                            <div className="absolute inset-0 bg-emerald-600/10 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[1px] transition-all rounded-3xl">
                               <p className="bg-white text-emerald-900 px-4 py-2 rounded-xl text-[8px] font-black uppercase shadow-2xl">Quét mã Ngân hàng</p>
                            </div>
                         </div>

                         <div className="space-y-4 relative z-10 text-center">
                            <p className="text-[10px] font-black uppercase text-emerald-400 mb-2">VietinBank - Giveback Community</p>
                            <p className="text-lg font-black tracking-tighter italic border-b border-emerald-800 pb-2">1234 5678 9999</p>
                            <p className="text-[8px] text-emerald-400 italic mt-2 uppercase">Vui lòng ghi nội dung: GB {selectedMission.location}</p>
                         </div>
                      </div>

                      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm text-center">
                        <p className="text-[10px] text-gray-400 font-bold italic mb-6 leading-relaxed uppercase tracking-widest">Bạn muốn quyên góp hiện vật?</p>
                        <p className="text-xs text-gray-600 mb-6 italic">Hãy mang đến văn phòng GIVEBACK hoặc gửi ship trực tiếp. Chúng tôi sẽ cập nhật ngay vào bảng danh mục sau khi nhận được!</p>
                        <button 
                          onClick={() => alert("Hãy nhắn tin cho Admin hoặc ghé mục 'Liên hệ' để lấy địa chỉ gửi nhu yếu phẩm bạn nhé!")}
                          className="w-full bg-emerald-50 text-emerald-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                        >
                          Quyên góp hiện vật
                        </button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
    </div>
  );
};

export default Home;
