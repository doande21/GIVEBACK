
import React, { useState, useEffect } from 'react';
import { CharityMission, User, AuctionItem, NeededItem, SocialPost, Sponsor } from '../types';
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  doc, 
  orderBy,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from '../services/firebase';
import { generateMissionImage } from '../services/geminiService';

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

interface AdminProps {
  user: User;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
}

const Admin: React.FC<AdminProps> = ({ user, onNotify }) => {
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  
  const [activeSubTab, setActiveSubTab] = useState<'missions' | 'sponsors' | 'auctions' | 'posts'>('missions');
  const [loading, setLoading] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isGeneratingAIVision, setIsGeneratingAIVision] = useState(false);

  // --- FORM STATES ---
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [missionForm, setMissionForm] = useState({
    location: '', description: '', date: '', targetBudget: 0, image: '', qrCode: '', itemsNeeded: [] as NeededItem[]
  });

  const [newItem, setNewItem] = useState({ name: '', target: 0, unit: 'cái' });

  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [sponsorForm, setSponsorForm] = useState({
    name: '', avatar: '', type: 'individual' as 'individual' | 'organization', message: '', totalMoney: 0, totalItemsCount: 0, rank: 'bronze' as 'gold' | 'silver' | 'bronze'
  });

  const [isAuctionModalOpen, setIsAuctionModalOpen] = useState(false);
  const [auctionForm, setAuctionForm] = useState({
    title: '', description: '', startingPrice: 0, endTime: '', missionLocation: '', donorName: '', image: ''
  });

  useEffect(() => {
    const unsubMissions = onSnapshot(query(collection(db, "missions"), orderBy("createdAt", "desc")), (snap) => {
      setMissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });
    const unsubSponsors = onSnapshot(collection(db, "sponsors"), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sponsor));
      data.sort((a, b) => (Number(b.totalMoney) || 0) - (Number(a.totalMoney) || 0));
      setSponsors(data);
    });
    const unsubAuctions = onSnapshot(query(collection(db, "auctions"), orderBy("createdAt", "desc")), (snap) => {
      setAuctions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuctionItem)));
    });
    const unsubPosts = onSnapshot(query(collection(db, "social_posts"), orderBy("createdAt", "desc")), (snap) => {
      setSocialPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPost)));
    });
    return () => { unsubMissions(); unsubSponsors(); unsubAuctions(); unsubPosts(); };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void, maxWidth = 800) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImg(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        let base64 = reader.result as string;
        if (file.type.startsWith('image/')) base64 = await compressImage(base64, maxWidth, 0.5);
        callback(base64);
        setIsProcessingImg(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenAIVision = async () => {
    if (!missionForm.location || !missionForm.description) {
      onNotify('warning', "Đệ hãy nhập Địa điểm và Mô tả trước nhé!", "Hệ thống");
      return;
    }
    setIsGeneratingAIVision(true);
    onNotify('info', "AI đang phác họa tầm nhìn...", "GIVEBACK AI");
    try {
      const imageUrl = await generateMissionImage(missionForm.location, missionForm.description);
      if (imageUrl) {
        setMissionForm({ ...missionForm, image: imageUrl });
        onNotify('success', "Tầm nhìn AI đã sẵn sàng!", "GIVEBACK AI");
      }
    } catch (err) { onNotify('error', "Lỗi kết nối AI."); } finally { setIsGeneratingAIVision(false); }
  };

  const addNeededItem = () => {
    if (!newItem.name || newItem.target <= 0) return;
    setMissionForm({
      ...missionForm,
      itemsNeeded: [...missionForm.itemsNeeded, { ...newItem, current: 0 }]
    });
    setNewItem({ name: '', target: 0, unit: 'cái' });
  };

  const removeNeededItem = (idx: number) => {
    const updated = [...missionForm.itemsNeeded];
    updated.splice(idx, 1);
    setMissionForm({ ...missionForm, itemsNeeded: updated });
  };

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { 
        ...missionForm, 
        targetBudget: Number(missionForm.targetBudget), 
        updatedAt: new Date().toISOString() 
      };
      if (editingMissionId) await updateDoc(doc(db, "missions", editingMissionId), data);
      else await addDoc(collection(db, "missions"), { ...data, currentBudget: 0, status: 'upcoming', createdAt: new Date().toISOString() });
      setIsMissionModalOpen(false);
      onNotify('success', "Sứ mệnh đã được lưu thành công!");
    } catch (err: any) { onNotify('error', "Lỗi lưu sứ mệnh."); } finally { setLoading(false); }
  };

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "auctions"), { 
        ...auctionForm, 
        currentBid: Number(auctionForm.startingPrice), 
        status: 'active', 
        authorId: user.id, 
        authorName: user.name, 
        createdAt: new Date().toISOString() 
      });
      setIsAuctionModalOpen(false);
      setAuctionForm({ title: '', description: '', startingPrice: 0, endTime: '', missionLocation: '', donorName: '', image: '' });
      onNotify('success', "Vật phẩm đã lên sàn đấu giá!");
    } catch (err: any) { onNotify('error', "Lỗi tạo đấu giá."); } finally { setLoading(false); }
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm("Đệ có chắc muốn xóa bài đăng này không?")) {
      try {
        await deleteDoc(doc(db, "social_posts", postId));
        onNotify('success', "Đã gỡ bỏ bài đăng vi phạm.");
      } catch (err) { onNotify('error', "Lỗi xóa bài."); }
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start mb-10 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">Admin Dashboard</h1>
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-4">Quản lý minh bạch, lan tỏa yêu thương</p>
        </div>
        <div className="flex bg-gray-900 p-1.5 rounded-[2.5rem] shadow-2xl overflow-x-auto scrollbar-hide max-w-full">
          <button onClick={() => setActiveSubTab('missions')} className={`px-5 md:px-6 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'missions' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Vùng cứu trợ</button>
          <button onClick={() => setActiveSubTab('sponsors')} className={`px-5 md:px-6 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'sponsors' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Vinh danh</button>
          <button onClick={() => setActiveSubTab('auctions')} className={`px-5 md:px-6 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'auctions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Đấu giá</button>
          <button onClick={() => setActiveSubTab('posts')} className={`px-5 md:px-6 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'posts' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Kiểm duyệt</button>
        </div>
      </div>

      {/* MISSIONS TAB */}
      {activeSubTab === 'missions' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-emerald-900 p-8 md:p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl">
             <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-black uppercase mb-2">Chiến dịch cứu trợ</h2>
                <p className="text-emerald-300 font-bold text-xs">Quản lý các chuyến đi và ngân sách vùng cao.</p>
             </div>
             <button onClick={() => { setEditingMissionId(null); setMissionForm({ location: '', description: '', date: '', targetBudget: 0, image: '', qrCode: '', itemsNeeded: [] }); setIsMissionModalOpen(true); }} className="bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Tạo mới chiến dịch</button>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {missions.map(m => (
                <div key={m.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 flex gap-5 items-center">
                   <img src={m.image || "https://placehold.co/150x150?text=Mission"} className="w-20 h-20 rounded-[2rem] object-cover" alt="" />
                   <div className="flex-1 min-w-0"><h4 className="text-lg font-black uppercase text-emerald-950 truncate">{m.location}</h4><p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(m.date).toLocaleDateString('vi-VN')}</p></div>
                   <div className="flex gap-2">
                      <button onClick={() => { setEditingMissionId(m.id); setMissionForm({ location: m.location, description: m.description, date: m.date, targetBudget: m.targetBudget, image: m.image, qrCode: m.qrCode || '', itemsNeeded: m.itemsNeeded || [] }); setIsMissionModalOpen(true); }} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button onClick={() => { if(window.confirm("Xóa sứ mệnh này?")) deleteDoc(doc(db, "missions", m.id)) }} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* AUCTIONS TAB */}
      {activeSubTab === 'auctions' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-indigo-900 p-8 md:p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl">
             <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-black uppercase mb-2">Quản lý Đấu giá</h2>
                <p className="text-indigo-300 font-bold text-xs">Tổ chức đấu giá gây quỹ nhân văn.</p>
             </div>
             <button onClick={() => setIsAuctionModalOpen(true)} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Đưa vật phẩm lên sàn</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctions.map(a => (
                <div key={a.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center">
                   <div className="w-full h-40 rounded-[2.5rem] overflow-hidden mb-4 relative">
                      <img src={a.image} className="w-full h-full object-cover" alt="" />
                      <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase">
                        {a.status === 'active' ? 'Đang diễn ra' : 'Kết thúc'}
                      </div>
                   </div>
                   <h4 className="text-sm font-black uppercase text-gray-900 text-center truncate w-full">{a.title}</h4>
                   <p className="text-[10px] text-indigo-600 font-black uppercase mt-1">Giá hiện tại: {a.currentBid.toLocaleString()}đ</p>
                   <button onClick={() => { if(window.confirm("Gỡ vật phẩm đấu giá?")) deleteDoc(doc(db, "auctions", a.id)) }} className="mt-4 p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              ))}
              {auctions.length === 0 && <div className="col-span-full py-20 text-center text-gray-300 font-black uppercase text-xs">Chưa có vật phẩm đấu giá nào...</div>}
           </div>
        </div>
      )}

      {/* POSTS/CENSORSHIP TAB */}
      {activeSubTab === 'posts' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-red-950 p-8 md:p-10 rounded-[3rem] text-white shadow-2xl">
             <h2 className="text-2xl md:text-3xl font-black uppercase mb-2">Kiểm duyệt bài viết</h2>
             <p className="text-red-300 font-bold text-xs">Giám sát và gỡ bỏ nội dung không phù hợp trên Bảng tin.</p>
           </div>
           <div className="grid grid-cols-1 gap-4">
              {socialPosts.map(post => (
                <div key={post.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center gap-6 group hover:border-red-100 transition-all">
                   <img src={post.authorAvatar} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                   <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black uppercase text-gray-900">{post.authorName}</h4>
                      <p className="text-[11px] text-gray-600 line-clamp-1">"{post.content}"</p>
                   </div>
                   <button onClick={() => handleDeletePost(post.id)} className="bg-red-50 text-red-500 p-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   </button>
                </div>
              ))}
              {socialPosts.length === 0 && <div className="py-20 text-center text-gray-300 font-black uppercase text-xs">Bảng tin đang trống...</div>}
           </div>
        </div>
      )}

      {/* SPONSORS TAB */}
      {activeSubTab === 'sponsors' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-amber-900 p-8 md:p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl">
             <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-black uppercase mb-2">Bảng Vàng Tri Ân</h2>
                <p className="text-amber-300 font-bold text-xs">Vinh danh những tấm lòng vàng đồng hành cùng dự án.</p>
             </div>
             <button onClick={() => setIsSponsorModalOpen(true)} className="bg-white text-amber-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Vinh danh mới</button>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {sponsors.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center text-center">
                   <img src={s.avatar || "https://placehold.co/100x100?text=Donor"} className="w-20 h-20 rounded-[2rem] object-cover mb-4 border-2 border-amber-50" alt="" />
                   <h4 className="text-sm font-black uppercase text-gray-900">{s.name}</h4>
                   <p className="text-[9px] text-amber-600 font-black uppercase mt-1 tracking-widest">Hạng {s.rank}</p>
                   <p className="text-[10px] text-gray-400 mt-3 line-clamp-2">"{s.message}"</p>
                   <button onClick={() => { if(window.confirm("Gỡ vinh danh?")) deleteDoc(doc(db, "sponsors", s.id)) }} className="mt-4 text-red-400 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* MODAL: SỨ MỆNH */}
      {isMissionModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md" onClick={() => setIsMissionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl p-8 md:p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 h-fit max-h-[90vh] overflow-y-auto custom-scrollbar">
             <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black uppercase text-emerald-900">CHI TIẾT SỨ MỆNH</h3><button onClick={() => setIsMissionModalOpen(false)} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button></div>
             <form onSubmit={handleSaveMission} className="space-y-6">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Thông tin cơ bản</h4>
                   <input required className="w-full bg-gray-50 p-4 rounded-xl font-bold outline-none text-sm" placeholder="Vùng cứu trợ" value={missionForm.location} onChange={e => setMissionForm({...missionForm, location: e.target.value})} />
                   <div className="grid grid-cols-2 gap-3"><input type="date" required className="bg-gray-50 p-4 rounded-xl font-bold text-sm" value={missionForm.date} onChange={e => setMissionForm({...missionForm, date: e.target.value})} /><input type="number" className="bg-gray-50 p-4 rounded-xl font-bold text-sm" placeholder="Ngân sách (đ)" value={missionForm.targetBudget || ''} onChange={e => setMissionForm({...missionForm, targetBudget: Number(e.target.value)})} /></div>
                   <textarea rows={2} className="w-full bg-gray-50 p-4 rounded-xl outline-none text-sm" placeholder="Mô tả kế hoạch..." value={missionForm.description} onChange={e => setMissionForm({...missionForm, description: e.target.value})} />
                </div>
                <div className="space-y-4 pt-4 border-t border-gray-100">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Danh sách nhu yếu phẩm</h4>
                   <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <input className="col-span-1 bg-white p-3 rounded-xl text-[11px] font-bold outline-none border border-gray-100" placeholder="Tên món đồ" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                        <input type="number" className="bg-white p-3 rounded-xl text-[11px] font-bold outline-none border border-gray-100" placeholder="Số lượng" value={newItem.target || ''} onChange={e => setNewItem({...newItem, target: Number(e.target.value)})} />
                        <input className="bg-white p-3 rounded-xl text-[11px] font-bold outline-none border border-gray-100" placeholder="Đơn vị" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                      </div>
                      <button type="button" onClick={addNeededItem} className="w-full bg-emerald-100 text-emerald-700 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">Thêm món +</button>
                   </div>
                   <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {missionForm.itemsNeeded.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-xl">
                          <div className="flex flex-col"><span className="text-[11px] font-black uppercase text-emerald-950">{item.name}</span><span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Cần: {item.target} {item.unit}</span></div>
                          <button type="button" onClick={() => removeNeededItem(idx)} className="text-red-400 hover:text-red-600 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                   <div className="h-32 border-2 border-dashed border-emerald-100 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden bg-gray-50 group">
                      {missionForm.image ? <img src={missionForm.image} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <span className="text-[8px] font-black uppercase text-emerald-400">Ảnh bìa</span>}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                        <button type="button" onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setMissionForm({...missionForm, image:url}), 800); i.click(); }} className="bg-white text-emerald-900 px-3 py-2 rounded-xl text-[8px] font-black uppercase">Tải ảnh 📤</button>
                        <button type="button" onClick={handleGenAIVision} disabled={isGeneratingAIVision} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-[8px] font-black uppercase">AI ✨</button>
                      </div>
                   </div>
                   <div onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setMissionForm({...missionForm, qrCode:url}), 600); i.click(); }} className="h-32 border-2 border-dashed border-amber-100 rounded-3xl flex items-center justify-center cursor-pointer hover:bg-amber-50 relative overflow-hidden bg-gray-50 group">
                      {missionForm.qrCode ? <img src={missionForm.qrCode} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <span className="text-[8px] font-black uppercase text-amber-400">Mã QR</span>}
                   </div>
                </div>
                <button type="submit" disabled={loading || isProcessingImg} className="w-full bg-emerald-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl text-xs">{loading ? "ĐANG LƯU..." : "XÁC NHẬN CHIẾN DỊCH"}</button>
             </form>
          </div>
        </div>
      )}

      {/* MODAL: ĐẤU GIÁ */}
      {isAuctionModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-md" onClick={() => setIsAuctionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl p-8 md:p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 h-fit max-h-[90vh] overflow-y-auto custom-scrollbar">
             <h3 className="text-xl font-black uppercase text-indigo-900 mb-8 text-center">ĐƯA VẬT PHẨM LÊN SÀN ĐẤU GIÁ</h3>
             <form onSubmit={handleCreateAuction} className="space-y-5">
                <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500" placeholder="Tên vật phẩm" value={auctionForm.title} onChange={e => setAuctionForm({...auctionForm, title: e.target.value})} />
                <textarea rows={3} className="w-full bg-gray-50 p-4 rounded-2xl font-medium outline-none border-2 border-transparent focus:border-indigo-500" placeholder="Mô tả vật phẩm..." value={auctionForm.description} onChange={e => setAuctionForm({...auctionForm, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <div className="relative">
                      <input type="number" required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Giá khởi điểm" value={auctionForm.startingPrice || ''} onChange={e => setAuctionForm({...auctionForm, startingPrice: Number(e.target.value)})} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">đ</span>
                   </div>
                   <input type="datetime-local" required className="bg-gray-50 p-4 rounded-2xl font-bold text-xs" value={auctionForm.endTime} onChange={e => setAuctionForm({...auctionForm, endTime: e.target.value})} />
                </div>
                <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Vùng cứu trợ sẽ nhận quỹ (Vd: Hà Giang)" value={auctionForm.missionLocation} onChange={e => setAuctionForm({...auctionForm, missionLocation: e.target.value})} />
                <input className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Tên nhà tài trợ (Nếu có)" value={auctionForm.donorName} onChange={e => setAuctionForm({...auctionForm, donorName: e.target.value})} />
                <div onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setAuctionForm({...auctionForm, image:url}), 800); i.click(); }} className="h-48 border-4 border-dashed border-indigo-50 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition-all relative overflow-hidden group">
                   {auctionForm.image ? <img src={auctionForm.image} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <span className="text-[10px] font-black uppercase text-indigo-300">Nhấn để tải ảnh vật phẩm</span>}
                </div>
                <button type="submit" disabled={loading || !auctionForm.image} className="w-full bg-indigo-900 text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl text-xs">{loading ? "ĐANG LÊN SÀN..." : "XÁC NHẬN LÊN SÀN"}</button>
             </form>
          </div>
        </div>
      )}

      {/* MODAL: VINH DANH */}
      {isSponsorModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-amber-950/80 backdrop-blur-md" onClick={() => setIsSponsorModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95">
             <h3 className="text-xl font-black uppercase text-amber-900 mb-8 text-center">VINH DANH NHÀ HẢO TÂM</h3>
             <form onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                try {
                  await addDoc(collection(db, "sponsors"), { ...sponsorForm, totalMoney: Number(sponsorForm.totalMoney), totalItemsCount: Number(sponsorForm.totalItemsCount), createdAt: new Date().toISOString(), history: [] });
                  setIsSponsorModalOpen(false);
                  onNotify('success', "Đã vinh danh tấm lòng vàng!");
                  setSponsorForm({ name: '', avatar: '', type: 'individual', message: '', totalMoney: 0, totalItemsCount: 0, rank: 'bronze' });
                } catch (err) { onNotify('error', "Lỗi lưu vinh danh."); } finally { setLoading(false); }
             }} className="space-y-4">
                <input required className="w-full bg-gray-50 p-4 rounded-xl font-bold outline-none" placeholder="Tên nhà hảo tâm" value={sponsorForm.name} onChange={e => setSponsorForm({...sponsorForm, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <select className="bg-gray-50 p-4 rounded-xl font-bold" value={sponsorForm.type} onChange={e => setSponsorForm({...sponsorForm, type: e.target.value as any})}><option value="individual">Cá nhân</option><option value="organization">Tổ chức</option></select>
                   <select className="bg-gray-50 p-4 rounded-xl font-bold" value={sponsorForm.rank} onChange={e => setSponsorForm({...sponsorForm, rank: e.target.value as any})}><option value="gold">Hạng Vàng</option><option value="silver">Hạng Bạc</option><option value="bronze">Hạng Đồng</option></select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" className="bg-gray-50 p-4 rounded-xl font-bold" placeholder="Tổng tiền (đ)" value={sponsorForm.totalMoney || ''} onChange={e => setSponsorForm({...sponsorForm, totalMoney: Number(e.target.value)})} />
                  <input type="number" className="bg-gray-50 p-4 rounded-xl font-bold" placeholder="Tổng món đồ" value={sponsorForm.totalItemsCount || ''} onChange={e => setSponsorForm({...sponsorForm, totalItemsCount: Number(e.target.value)})} />
                </div>
                <textarea className="w-full bg-gray-50 p-4 rounded-xl font-medium" placeholder="Lời nhắn gửi..." value={sponsorForm.message} onChange={e => setSponsorForm({...sponsorForm, message: e.target.value})} />
                <button type="submit" disabled={loading} className="w-full bg-amber-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">{loading ? "ĐANG VINH DANH..." : "LƯU VINH DANH"}</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
