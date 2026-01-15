
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
    location: '', description: '', date: '', targetBudget: 0, image: '', qrCode: '', itemsNeeded: [] as NeededItem[], gallery: [] as string[]
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

  const handleFileUpload = async (e: any, callback: (url: string) => void, maxWidth = 800) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
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

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...missionForm, targetBudget: Number(missionForm.targetBudget), updatedAt: new Date().toISOString() };
      if (editingMissionId) await updateDoc(doc(db, "missions", editingMissionId), data);
      else await addDoc(collection(db, "missions"), { ...data, currentBudget: 0, status: 'ongoing', createdAt: new Date().toISOString() });
      setIsMissionModalOpen(false);
      onNotify('success', "Sứ mệnh đã được lưu thành công!");
    } catch (err: any) { onNotify('error', "Lỗi lưu sứ mệnh."); } finally { setLoading(false); }
  };

  const addNeededItem = () => {
    if (!newItem.name || newItem.target <= 0) return;
    setMissionForm({ ...missionForm, itemsNeeded: [...missionForm.itemsNeeded, { ...newItem, current: 0 }] });
    setNewItem({ name: '', target: 0, unit: 'cái' });
  };

  const removeNeededItem = (idx: number) => {
    const updated = [...missionForm.itemsNeeded];
    updated.splice(idx, 1);
    setMissionForm({ ...missionForm, itemsNeeded: updated });
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start mb-10 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Admin Dashboard</h1>
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-4">Quản lý minh bạch, lan tỏa yêu thương</p>
        </div>
        <div className="flex bg-gray-900 p-1.5 rounded-[2.5rem] shadow-2xl overflow-x-auto scrollbar-hide max-w-full border border-gray-800">
          <button onClick={() => setActiveSubTab('missions')} className={`px-5 md:px-6 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'missions' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Vùng cứu trợ</button>
          <button onClick={() => setActiveSubTab('sponsors')} className={`px-5 md:px-6 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'sponsors' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Vinh danh</button>
          <button onClick={() => setActiveSubTab('auctions')} className={`px-5 md:px-6 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'auctions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Đấu giá</button>
          <button onClick={() => setActiveSubTab('posts')} className={`px-5 md:px-6 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'posts' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Kiểm duyệt</button>
        </div>
      </div>

      {activeSubTab === 'missions' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-emerald-900 p-8 md:p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl">
             <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-black uppercase mb-2">Chiến dịch cứu trợ</h2>
                <p className="text-emerald-300 font-bold text-xs uppercase tracking-widest">Quản lý ngân sách & nhu yếu phẩm vùng cao.</p>
             </div>
             <button onClick={() => { setEditingMissionId(null); setMissionForm({ location: '', description: '', date: '', targetBudget: 0, image: '', qrCode: '', itemsNeeded: [], gallery: [] }); setIsMissionModalOpen(true); }} className="bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Tạo mới chiến dịch</button>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {missions.map(m => (
                <div key={m.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 flex gap-5 items-center">
                   <img src={m.image || "https://placehold.co/150x150?text=Mission"} className="w-20 h-20 rounded-[2rem] object-cover" alt="" />
                   <div className="flex-1 min-w-0"><h4 className="text-lg font-black uppercase text-emerald-950 dark:text-emerald-400 truncate">{m.location}</h4><p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(m.date).toLocaleDateString('vi-VN')}</p></div>
                   <div className="flex gap-2">
                      <button onClick={() => { setEditingMissionId(m.id); setMissionForm({ location: m.location, description: m.description, date: m.date, targetBudget: m.targetBudget, image: m.image, qrCode: m.qrCode || '', itemsNeeded: m.itemsNeeded || [], gallery: m.gallery || [] }); setIsMissionModalOpen(true); }} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0 -2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2 -2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                      <button onClick={() => { if(window.confirm("Xóa sứ mệnh này?")) deleteDoc(doc(db, "missions", m.id)) }} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2V6m3 0V4a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeSubTab === 'sponsors' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-amber-900 p-8 md:p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl">
             <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-black uppercase mb-2">Bảng Vàng Tri Ân</h2>
                <p className="text-amber-300 font-bold text-xs uppercase tracking-widest">Vinh danh những tấm lòng vàng đồng hành.</p>
             </div>
             <button onClick={() => setIsSponsorModalOpen(true)} className="bg-white text-amber-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Vinh danh mới</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sponsors.map(s => (
                <div key={s.id} className="bg-white dark:bg-slate-900 p-6 rounded-[3rem] shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center">
                   <img src={s.avatar || `https://ui-avatars.com/api/?name=${s.name}&background=amber&color=fff`} className="w-20 h-20 rounded-[2rem] object-cover mb-4 border-2 border-amber-50" alt="" />
                   <h4 className="text-sm font-black uppercase text-gray-900 dark:text-white">{s.name}</h4>
                   <p className="text-[9px] text-amber-600 font-black uppercase mt-1 tracking-widest">Hạng {s.rank}</p>
                   <p className="text-xs font-black text-gray-950 dark:text-white mt-4">{s.totalMoney.toLocaleString()}đ</p>
                   <div className="flex gap-2 mt-4">
                      <button onClick={() => { if(window.confirm("Gỡ vinh danh?")) deleteDoc(doc(db, "sponsors", s.id)) }} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2V6m3 0V4a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeSubTab === 'auctions' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-indigo-900 p-8 md:p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl">
             <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-black uppercase mb-2">Quản lý Đấu giá</h2>
                <p className="text-indigo-300 font-bold text-xs uppercase tracking-widest">Vật phẩm nhân văn gây quỹ cứu trợ.</p>
             </div>
             <button onClick={() => setIsAuctionModalOpen(true)} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Đưa vật phẩm lên sàn</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctions.map(a => (
                <div key={a.id} className="bg-white dark:bg-slate-900 p-6 rounded-[3rem] shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center">
                   <div className="w-full h-40 rounded-[2.5rem] overflow-hidden mb-4 relative">
                      <img src={a.image} className="w-full h-full object-cover" alt="" />
                      <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase">
                        {a.status === 'active' ? 'Đang đấu giá' : 'Đã kết thúc'}
                      </div>
                   </div>
                   <h4 className="text-sm font-black uppercase text-gray-900 dark:text-white text-center truncate w-full">{a.title}</h4>
                   <p className="text-[10px] text-indigo-600 font-black uppercase mt-1">Giá hiện tại: {a.currentBid.toLocaleString()}đ</p>
                   <button onClick={() => { if(window.confirm("Gỡ vật phẩm đấu giá?")) deleteDoc(doc(db, "auctions", a.id)) }} className="mt-4 p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2V6m3 0V4a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeSubTab === 'posts' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-red-950 p-8 md:p-10 rounded-[3rem] text-white shadow-2xl">
             <h2 className="text-2xl md:text-3xl font-black uppercase mb-2">Kiểm duyệt bài viết</h2>
             <p className="text-red-300 font-bold text-xs uppercase tracking-widest">Giám sát nội dung cộng đồng.</p>
           </div>
           <div className="grid grid-cols-1 gap-4">
              {socialPosts.map(post => (
                <div key={post.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border-2 border-gray-100 dark:border-slate-800 flex items-center gap-6 group hover:border-red-200 transition-all">
                   <img src={post.authorAvatar} className="w-14 h-14 rounded-2xl object-cover border-2 border-gray-50 shadow-sm" alt="" />
                   <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black uppercase text-gray-900 dark:text-white">{post.authorName}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 italic">"{post.content}"</p>
                   </div>
                   <button onClick={() => { if(window.confirm("Xóa bài này?")) deleteDoc(doc(db, "social_posts", post.id)) }} className="bg-red-50 text-red-500 p-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2V6m3 0V4a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"></path></svg>
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* MODAL: SỨ MỆNH */}
      {isMissionModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md" onClick={() => setIsMissionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-4xl p-8 md:p-12 rounded-[3rem] shadow-2xl h-fit max-h-[90vh] overflow-y-auto custom-scrollbar border-4 border-emerald-50">
             <h3 className="text-2xl font-black uppercase text-emerald-900 mb-10 text-center tracking-tighter">CẬP NHẬT CHI TIẾT SỨ MỆNH</h3>
             <form onSubmit={handleSaveMission} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-4">Vùng cứu trợ</label>
                      <input required className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none text-emerald-950 focus:border-emerald-500" placeholder="Vd: Vân Canh, Hà Giang..." value={missionForm.location} onChange={e => setMissionForm({...missionForm, location: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-4">Ngày đi</label>
                      <input type="date" required className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none text-emerald-950 focus:border-emerald-500" value={missionForm.date} onChange={e => setMissionForm({...missionForm, date: e.target.value})} />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-gray-400 uppercase ml-4">Ngân sách dự kiến (VNĐ)</label>
                   <input type="number" required className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none text-emerald-950 focus:border-emerald-500" placeholder="Nhập số tiền..." value={missionForm.targetBudget || ''} onChange={e => setMissionForm({...missionForm, targetBudget: Number(e.target.value)})} />
                </div>
                <textarea rows={2} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none text-emerald-950 focus:border-emerald-500" placeholder="Mô tả kế hoạch..." value={missionForm.description} onChange={e => setMissionForm({...missionForm, description: e.target.value})} />
                
                <div className="space-y-4 pt-4 border-t border-gray-100">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Danh sách nhu yếu phẩm</h4>
                   <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input className="bg-white p-4 rounded-xl text-sm font-bold border border-gray-100 outline-none" placeholder="Tên món" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                        <input type="number" className="bg-white p-4 rounded-xl text-sm font-bold border border-gray-100 outline-none" placeholder="Số lượng" value={newItem.target || ''} onChange={e => setNewItem({...newItem, target: Number(e.target.value)})} />
                        <input className="bg-white p-4 rounded-xl text-sm font-bold border border-gray-100 outline-none" placeholder="Đơn vị" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                      </div>
                      <button type="button" onClick={addNeededItem} className="w-full bg-emerald-100 text-emerald-700 py-3 rounded-xl text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all">Thêm món +</button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                   <div className="h-40 border-2 border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden bg-gray-50 group hover:border-emerald-300">
                      {missionForm.image ? <img src={missionForm.image} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <span className="text-[10px] font-black uppercase text-emerald-300">Ảnh bìa sứ mệnh</span>}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-3">
                        <button type="button" onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setMissionForm({...missionForm, image:url}), 800); i.click(); }} className="bg-white text-emerald-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase">Tải ảnh 📤</button>
                        <button type="button" onClick={handleGenAIVision} disabled={isGeneratingAIVision} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">AI ✨</button>
                      </div>
                   </div>
                   <div onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setMissionForm({...missionForm, qrCode:url}), 600); i.click(); }} className="h-40 border-2 border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 relative overflow-hidden bg-gray-50 group hover:border-amber-300 transition-all">
                      {missionForm.qrCode ? <img src={missionForm.qrCode} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <span className="text-[10px] font-black uppercase text-amber-300 text-center px-4">Tải ảnh mã QR Ngân hàng</span>}
                   </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-emerald-950 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all">
                  {loading ? "ĐANG LƯU..." : "XÁC NHẬN LƯU CHIẾN DỊCH 🚀"}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* MODAL: VINH DANH */}
      {isSponsorModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-amber-950/80 backdrop-blur-md" onClick={() => setIsSponsorModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl p-10 rounded-[3rem] shadow-2xl border-4 border-amber-50">
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
                <input required className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl font-bold outline-none text-amber-950" placeholder="Tên nhà hảo tâm" value={sponsorForm.name} onChange={e => setSponsorForm({...sponsorForm, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <select className="bg-gray-50 border-2 border-gray-100 p-4 rounded-xl font-bold text-amber-900" value={sponsorForm.type} onChange={e => setSponsorForm({...sponsorForm, type: e.target.value as any})}><option value="individual">Cá nhân</option><option value="organization">Tổ chức</option></select>
                   <select className="bg-gray-50 border-2 border-gray-100 p-4 rounded-xl font-bold text-amber-900" value={sponsorForm.rank} onChange={e => setSponsorForm({...sponsorForm, rank: e.target.value as any})}><option value="gold">Hạng Vàng</option><option value="silver">Hạng Bạc</option><option value="bronze">Hạng Đồng</option></select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" className="bg-gray-50 border-2 border-gray-100 p-4 rounded-xl font-bold text-amber-900" placeholder="Tổng tiền (đ)" value={sponsorForm.totalMoney || ''} onChange={e => setSponsorForm({...sponsorForm, totalMoney: Number(e.target.value)})} />
                  <input type="number" className="bg-gray-50 border-2 border-gray-100 p-4 rounded-xl font-bold text-amber-900" placeholder="Tổng món đồ" value={sponsorForm.totalItemsCount || ''} onChange={e => setSponsorForm({...sponsorForm, totalItemsCount: Number(e.target.value)})} />
                </div>
                <textarea className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl font-bold outline-none text-amber-950" placeholder="Lời nhắn gửi..." value={sponsorForm.message} onChange={e => setSponsorForm({...sponsorForm, message: e.target.value})} />
                <div onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setSponsorForm({...sponsorForm, avatar:url}), 400); i.click(); }} className="h-32 border-2 border-dashed border-amber-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 relative overflow-hidden bg-gray-50 group">
                   {sponsorForm.avatar ? <img src={sponsorForm.avatar} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <span className="text-[9px] font-black uppercase text-amber-300">Tải ảnh đại diện</span>}
                </div>
                <button type="submit" disabled={loading} className="w-full bg-amber-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-black transition-all">{loading ? "ĐANG VINH DANH..." : "LƯU VINH DANH ✨"}</button>
             </form>
          </div>
        </div>
      )}

      {/* MODAL: ĐẤU GIÁ */}
      {isAuctionModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-md" onClick={() => setIsAuctionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl p-8 md:p-10 rounded-[3rem] shadow-2xl border-4 border-indigo-50">
             <h3 className="text-xl font-black uppercase text-indigo-900 mb-8 text-center">ĐƯA VẬT PHẨM LÊN SÀN ĐẤU GIÁ</h3>
             <form onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                try {
                  await addDoc(collection(db, "auctions"), { ...auctionForm, currentBid: Number(auctionForm.startingPrice), status: 'active', authorId: user.id, authorName: user.name, createdAt: new Date().toISOString() });
                  setIsAuctionModalOpen(false);
                  onNotify('success', "Vật phẩm đã lên sàn đấu giá!");
                  setAuctionForm({ title: '', description: '', startingPrice: 0, endTime: '', missionLocation: '', donorName: '', image: '' });
                } catch (err) { onNotify('error', "Lỗi tạo đấu giá."); } finally { setLoading(false); }
             }} className="space-y-4">
                <input required className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none text-indigo-950" placeholder="Tên vật phẩm" value={auctionForm.title} onChange={e => setAuctionForm({...auctionForm, title: e.target.value})} />
                <textarea rows={3} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none text-indigo-950" placeholder="Mô tả..." value={auctionForm.description} onChange={e => setAuctionForm({...auctionForm, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" required className="bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold text-indigo-950" placeholder="Giá khởi điểm" value={auctionForm.startingPrice || ''} onChange={e => setAuctionForm({...auctionForm, startingPrice: Number(e.target.value)})} />
                   <input type="datetime-local" required className="bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold text-xs text-indigo-950" value={auctionForm.endTime} onChange={e => setAuctionForm({...auctionForm, endTime: e.target.value})} />
                </div>
                <input required className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none text-indigo-950" placeholder="Hỗ trợ vùng cứu trợ nào?" value={auctionForm.missionLocation} onChange={e => setAuctionForm({...auctionForm, missionLocation: e.target.value})} />
                <div onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setAuctionForm({...auctionForm, image:url}), 800); i.click(); }} className="h-40 border-2 border-dashed border-indigo-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 relative overflow-hidden bg-gray-50 group">
                   {auctionForm.image ? <img src={auctionForm.image} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <span className="text-[9px] font-black uppercase text-indigo-300 text-center px-4">Tải ảnh sản phẩm đấu giá</span>}
                </div>
                <button type="submit" disabled={loading || !auctionForm.image} className="w-full bg-indigo-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">
                  {loading ? "ĐANG LÊN SÀN..." : "XÁC NHẬN LÊN SÀN 🔨"}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
