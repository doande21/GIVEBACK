
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
  const [selectedMission, setSelectedMission] = useState<CharityMission | null>(null);
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
      
      {/* Official Missions Section */}
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
                onClick={() => setSelectedMission(mission)}
                className="flex-shrink-0 w-72 bg-white rounded-[2rem] shadow-sm border border-emerald-50 overflow-hidden group hover:shadow-xl transition-all cursor-pointer"
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
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[9px] font-black text-emerald-600 uppercase">Tiến độ quỹ:</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase">{Math.round((mission.currentBudget / mission.targetBudget) * 100)}%</p>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (mission.currentBudget / mission.targetBudget) * 100)}%` }}></div>
                  </div>
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
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src={post.authorAvatar} className="w-10 h-10 rounded-full border border-gray-50 object-cover" alt="" />
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

      {/* Mission Detail Modal (CẬP NHẬT TÍNH NĂNG QR VÀ TIỀN BẠC) */}
      {selectedMission && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 overflow-y-auto py-8">
          <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-md" onClick={() => setSelectedMission(null)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[95vh]">
             <button onClick={() => setSelectedMission(null)} className="absolute top-6 right-6 z-20 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>

             <div className="h-64 md:h-80 relative bg-gray-900">
                <img src={selectedMission.image} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-transparent to-transparent"></div>
                <div className="absolute bottom-8 left-8 right-8">
                  <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl mb-2 inline-block">Kế hoạch cứu trợ</span>
                  <h2 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none">{selectedMission.location}</h2>
                </div>
             </div>

             <div className="p-8 md:p-12 overflow-y-auto bg-gray-50/30">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                   
                   {/* Left Col: Info & Progress */}
                   <div className="lg:col-span-2 space-y-10">
                      <div>
                        <div className="flex justify-between items-end mb-4">
                          <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Tiến độ tài chính chuyến đi</h4>
                          <p className="text-emerald-600 font-black italic text-xl">{(selectedMission.currentBudget / 1000000).toFixed(1)}Tr / {(selectedMission.targetBudget / 1000000).toFixed(0)}Tr VNĐ</p>
                        </div>
                        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner flex">
                           <div 
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000"
                              style={{ width: `${Math.min(100, (selectedMission.currentBudget / selectedMission.targetBudget) * 100)}%` }}
                           ></div>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-widest text-center">Đã hoàn thành {Math.round((selectedMission.currentBudget / selectedMission.targetBudget) * 100)}% mục tiêu quỹ</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-white p-6 rounded-[2rem] border border-emerald-50 shadow-sm">
                            <p className="text-2xl font-black text-emerald-900 tracking-tighter italic">{selectedMission.targetHouseholds}+</p>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Hộ dân được giúp</p>
                         </div>
                         <div className="bg-white p-6 rounded-[2rem] border border-emerald-50 shadow-sm">
                            <p className="text-2xl font-black text-emerald-900 tracking-tighter italic">{selectedMission.itemsNeeded.length}</p>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Loại vật phẩm cần</p>
                         </div>
                      </div>

                      <div className="prose prose-emerald max-w-none">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mb-4">Kế hoạch chi tiết</h4>
                        <p className="text-gray-600 leading-relaxed italic text-lg">"{selectedMission.description}"</p>
                      </div>

                      {/* Transparency Table (Bản mẫu minh bạch) */}
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mb-4">Minh bạch đóng góp (Mới nhất)</h4>
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm text-[10px]">
                           <table className="w-full text-left">
                              <thead className="bg-gray-50 uppercase text-gray-400">
                                <tr>
                                  <th className="px-4 py-3 font-black">Nhà hảo tâm</th>
                                  <th className="px-4 py-3 font-black">Số tiền</th>
                                  <th className="px-4 py-3 font-black">Lời nhắn</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                 {/* Dữ liệu này thực tế nên query từ một collection đóng góp riêng */}
                                 <tr>
                                    <td className="px-4 py-3 font-bold">Nguyễn Văn A (Ẩn danh)</td>
                                    <td className="px-4 py-3 text-emerald-600 font-black">2.000.000đ</td>
                                    <td className="px-4 py-3 italic">Gửi chút lòng thành cho bà con</td>
                                 </tr>
                                 <tr>
                                    <td className="px-4 py-3 font-bold">Mạnh Thường Quân 21</td>
                                    <td className="px-4 py-3 text-emerald-600 font-black">500.000đ</td>
                                    <td className="px-4 py-3 italic">Hỗ trợ các em nhỏ mua vở</td>
                                 </tr>
                              </tbody>
                           </table>
                           <div className="p-3 bg-emerald-50 text-center">
                              <p className="text-emerald-700 font-black uppercase tracking-widest">Xem toàn bộ sao kê tại nhóm GIVEBACK ZALO</p>
                           </div>
                        </div>
                      </div>
                   </div>

                   {/* Right Col: QR & Action */}
                   <div className="space-y-8">
                      <div className="bg-emerald-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                         <div className="absolute inset-0 bg-white/5 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                         <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 text-emerald-200 text-center relative z-10">Quyên góp trực tiếp</h4>
                         <div className="bg-white p-4 rounded-3xl mb-6 relative z-10 group-hover:scale-105 transition-transform">
                            {/* Chỗ này Đệ có thể dùng API VietQR để gen QR động nếu có số TK cụ thể */}
                            <img src={`https://api.vietqr.io/image/970415-11336699-2Gf8E7C.jpg?accountName=GIVEBACK%20OFFICIAL&amount=100000&addInfo=QUYEN%20GOP%20${selectedMission.location.replace(/ /g, '%20')}`} className="w-full h-auto" alt="QR Quyên góp" />
                         </div>
                         <div className="text-center space-y-2 relative z-10">
                            <p className="text-[10px] font-black uppercase">Ngân hàng VietinBank</p>
                            <p className="text-lg font-black tracking-tighter italic">1234 5678 9999</p>
                            <p className="text-[9px] font-bold text-emerald-400">Chủ TK: GIVEBACK COMMUNITY</p>
                         </div>
                      </div>

                      <div className="bg-amber-50 p-8 rounded-[3rem] border border-amber-200">
                        <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-[0.3em] mb-4">Vật phẩm đang cần</h4>
                        <div className="space-y-4">
                           {selectedMission.itemsNeeded.map((item, idx) => (
                             <div key={idx} className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-700 uppercase">{item.name}</span>
                                <span className="text-[10px] font-black text-amber-600">{item.current}/{item.target} {item.unit}</span>
                             </div>
                           ))}
                        </div>
                        <button 
                          onClick={() => alert("Chụp ảnh bill chuyển khoản và gửi cho Admin qua mục 'Tin nhắn' để được ghi danh bảng vàng nhé Đệ!")}
                          className="w-full mt-6 bg-amber-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl"
                        >
                          Xác nhận đã chuyển
                        </button>
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
