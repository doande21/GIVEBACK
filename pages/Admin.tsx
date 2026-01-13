
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
    // Fix: Correct typo from 'SocialSocialPost' to 'SocialPost' which is imported from types.ts
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

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...missionForm, targetBudget: Number(missionForm.targetBudget), updatedAt: new Date().toISOString() };
      if (editingMissionId) await updateDoc(doc(db, "missions", editingMissionId), data);
      else await addDoc(collection(db, "missions"), { ...data, currentBudget: 0, status: 'upcoming', createdAt: new Date().toISOString() });
      setIsMissionModalOpen(false);
      onNotify('success', "Sứ mệnh đã được lưu thành công!");
    } catch (err: any) { onNotify('error', "Lỗi lưu sứ mệnh."); } finally { setLoading(false); }
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "sponsors"), { 
        ...sponsorForm, 
        totalMoney: Number(sponsorForm.totalMoney), 
        totalItemsCount: Number(sponsorForm.totalItemsCount), 
        createdAt: new Date().toISOString(), 
        history: [] 
      });
      setIsSponsorModalOpen(false);
      onNotify('success', "Đã vinh danh nhà hảo tâm mới!");
      setSponsorForm({ name: '', avatar: '', type: 'individual', message: '', totalMoney: 0, totalItemsCount: 0, rank: 'bronze' });
    } catch (err) { onNotify('error', "Lỗi vinh danh."); } finally { setLoading(false); }
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
      onNotify('success', "Vật phẩm đã lên sàn đấu giá!");
    } catch (err: any) { onNotify('error', "Lỗi tạo đấu giá."); } finally { setLoading(false); }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen font-['Inter']">
      <div className="flex flex-col lg:flex-row justify-between items-start mb-10 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">Admin Dashboard</h1>
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-4 italic">Quản lý minh bạch, lan tỏa yêu thương</p>
        </div>
        <div className="flex bg-gray-900 p-1.5 rounded-[2.5rem] shadow-2xl overflow-x-auto scrollbar-hide max-w-full">
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
                <h2 className="text-2xl md:text-3xl font-black italic uppercase mb-2">Chiến dịch cứu trợ</h2>
                <p className="text-emerald-300 font-bold text-xs italic">Quản lý các chuyến đi và ngân sách vùng cao.</p>
             </div>
             <button onClick={() => { setEditingMissionId(null); setMissionForm({ location: '', description: '', date: '', targetBudget: 0, image: '', qrCode: '', itemsNeeded: [] }); setIsMissionModalOpen(true); }} className="bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Tạo mới chiến dịch</button>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {missions.map(m => (
                <div key={m.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 flex gap-5 items-center">
                   <img src={m.image || "https://placehold.co/150x150?text=Mission"} className="w-20 h-20 rounded-[2rem] object-cover" alt="" />
                   <div className="flex-1 min-w-0"><h4 className="text-lg font-black uppercase italic text-emerald-950 truncate">{m.location}</h4><p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(m.date).toLocaleDateString('vi-VN')}</p></div>
                   <div className="flex gap-2">
                      <button onClick={() => { setEditingMissionId(m.id); setMissionForm({ location: m.location, description: m.description, date: m.date, targetBudget: m.targetBudget, image: m.image, qrCode: m.qrCode || '', itemsNeeded: m.itemsNeeded || [] }); setIsMissionModalOpen(true); }} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button onClick={() => { if(window.confirm("Xóa sứ mệnh này?")) deleteDoc(doc(db, "missions", m.id)) }} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
                <h2 className="text-2xl md:text-3xl font-black italic uppercase mb-2">Bảng Vàng Tri Ân</h2>
                <p className="text-amber-300 font-bold text-xs italic">Vinh danh những tấm lòng vàng đồng hành cùng dự án.</p>
             </div>
             <button onClick={() => setIsSponsorModalOpen(true)} className="bg-white text-amber-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Vinh danh mới</button>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {sponsors.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center text-center">
                   <img src={s.avatar || "https://placehold.co/100x100?text=Donor"} className="w-20 h-20 rounded-[2rem] object-cover mb-4 border-2 border-amber-50" alt="" />
                   <h4 className="text-sm font-black uppercase italic text-gray-900">{s.name}</h4>
                   <p className="text-[9px] text-amber-600 font-black uppercase mt-1 tracking-widest">Hạng {s.rank}</p>
                   <p className="text-[10px] text-gray-400 mt-3 italic line-clamp-2">"{s.message}"</p>
                   <button onClick={() => { if(window.confirm("Gỡ vinh danh?")) deleteDoc(doc(db, "sponsors", s.id)) }} className="mt-4 text-red-400 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeSubTab === 'auctions' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-indigo-900 p-8 md:p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl">
             <div className="text-center md:text-left"><h2 className="text-2xl md:text-3xl font-black italic uppercase mb-2">Sàn Đấu giá Gây quỹ</h2><p className="text-indigo-300 font-bold text-xs italic">Kích hoạt vật phẩm đấu giá để hỗ trợ vùng cao.</p></div>
             <button onClick={() => setIsAuctionModalOpen(true)} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Lên sàn vật phẩm</button>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {auctions.map(a => (
                <div key={a.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 flex gap-5 items-center">
                   <img src={a.image || "https://placehold.co/100x100?text=Auction"} className="w-20 h-20 rounded-[2rem] object-cover" alt="" />
                   <div className="flex-1 min-w-0"><h4 className="text-lg font-black uppercase italic text-indigo-950 truncate">{a.title}</h4><p className="text-[10px] text-indigo-600 font-black uppercase">{a.currentBid.toLocaleString()} VNĐ</p></div>
                   <button onClick={() => { if(window.confirm("Hủy phiên đấu giá?")) deleteDoc(doc(db, "auctions", a.id)) }} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeSubTab === 'posts' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-red-900 p-8 md:p-10 rounded-[3rem] text-white shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-black italic uppercase mb-2">Kiểm duyệt cộng đồng</h2>
              <p className="text-red-300 font-bold text-xs italic">Giám sát và gỡ bỏ các bài đăng không phù hợp để giữ an toàn cho GIVEBACK.</p>
           </div>
           <div className="space-y-4">
              {socialPosts.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between">
                   <div className="flex items-center space-x-4">
                      <img src={p.authorAvatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
                      <div><p className="text-xs font-black uppercase italic text-gray-900">{p.authorName}</p><p className="text-[10px] text-gray-400 line-clamp-1 italic">"{p.content}"</p></div>
                   </div>
                   <button onClick={() => { if(window.confirm("Gỡ bài viết này?")) deleteDoc(doc(db, "social_posts", p.id)) }} className="bg-red-50 text-red-600 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Gỡ bài</button>
                </div>
              ))}
              {socialPosts.length === 0 && <p className="text-center py-20 text-gray-300 font-black uppercase text-[10px] tracking-widest italic">Chưa có bài đăng nào trên cộng đồng...</p>}
           </div>
        </div>
      )}

      {/* MODAL: VINH DANH */}
      {isSponsorModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-amber-950/80 backdrop-blur-md" onClick={() => setIsSponsorModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 h-fit max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black uppercase italic text-amber-900">VINH DANH MỚI</h3>
                <button onClick={() => setIsSponsorModalOpen(false)} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <form onSubmit={handleSaveSponsor} className="space-y-4">
                <input required className="w-full bg-gray-50 p-4 rounded-xl font-bold outline-none text-sm" placeholder="Tên nhà hảo tâm" value={sponsorForm.name} onChange={e => setSponsorForm({...sponsorForm, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                   <select className="bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none" value={sponsorForm.type} onChange={e => setSponsorForm({...sponsorForm, type: e.target.value as any})}>
                      <option value="individual">Cá nhân</option><option value="organization">Tổ chức</option>
                   </select>
                   <select className="bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none" value={sponsorForm.rank} onChange={e => setSponsorForm({...sponsorForm, rank: e.target.value as any})}>
                      <option value="gold">Hạng Vàng</option><option value="silver">Hạng Bạc</option><option value="bronze">Hạng Đồng</option>
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <input type="number" className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm" placeholder="Tổng tiền (đ)" value={sponsorForm.totalMoney || ''} onChange={e => setSponsorForm({...sponsorForm, totalMoney: Number(e.target.value)})} />
                   <input type="number" className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm" placeholder="Số hiện vật" value={sponsorForm.totalItemsCount || ''} onChange={e => setSponsorForm({...sponsorForm, totalItemsCount: Number(e.target.value)})} />
                </div>
                <textarea className="w-full bg-gray-50 p-4 rounded-xl font-medium italic text-sm outline-none" placeholder="Lời nhắn tri ân..." rows={3} value={sponsorForm.message} onChange={e => setSponsorForm({...sponsorForm, message: e.target.value})} />
                <div onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setSponsorForm({...sponsorForm, avatar:url}), 300); i.click(); }} className="h-32 border-2 border-dashed border-amber-100 rounded-3xl flex items-center justify-center cursor-pointer hover:bg-amber-50 relative overflow-hidden bg-gray-50">
                   {sponsorForm.avatar ? <img src={sponsorForm.avatar} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <span className="text-[9px] font-black uppercase text-amber-400">Tải ảnh đại diện</span>}
                </div>
                <button type="submit" disabled={loading || isProcessingImg} className="w-full bg-amber-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl text-xs">{loading ? 'ĐANG LƯU...' : 'XÁC NHẬN VINH DANH'}</button>
             </form>
          </div>
        </div>
      )}

      {/* MODAL: SỨ MỆNH (ĐÃ CÓ TRƯỚC ĐÓ) */}
      {isMissionModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md" onClick={() => setIsMissionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 h-fit max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black uppercase italic text-emerald-900">CHI TIẾT SỨ MỆNH</h3><button onClick={() => setIsMissionModalOpen(false)} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button></div>
             <form onSubmit={handleSaveMission} className="space-y-4">
                <input required className="w-full bg-gray-50 p-4 rounded-xl font-bold outline-none text-sm" placeholder="Vùng cứu trợ" value={missionForm.location} onChange={e => setMissionForm({...missionForm, location: e.target.value})} />
                <div className="grid grid-cols-2 gap-3"><input type="date" required className="bg-gray-50 p-4 rounded-xl font-bold text-sm" value={missionForm.date} onChange={e => setMissionForm({...missionForm, date: e.target.value})} /><input type="number" className="bg-gray-50 p-4 rounded-xl font-bold text-sm" placeholder="Ngân sách (đ)" value={missionForm.targetBudget || ''} onChange={e => setMissionForm({...missionForm, targetBudget: Number(e.target.value)})} /></div>
                <textarea rows={3} className="w-full bg-gray-50 p-4 rounded-xl italic outline-none text-sm" placeholder="Mô tả kế hoạch..." value={missionForm.description} onChange={e => setMissionForm({...missionForm, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
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

      {/* MODAL: ĐẤU GIÁ (ĐÃ CÓ TRƯỚC ĐÓ) */}
      {isAuctionModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-indigo-950/90 backdrop-blur-md" onClick={() => setIsAuctionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 h-fit max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black uppercase italic text-indigo-900">CHI TIẾT ĐẤU GIÁ</h3><button onClick={() => setIsAuctionModalOpen(false)} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button></div>
             <form onSubmit={handleCreateAuction} className="space-y-4">
                <input required className="w-full bg-gray-50 p-4 rounded-xl font-bold outline-none text-sm" placeholder="Tên vật phẩm" value={auctionForm.title} onChange={e => setAuctionForm({...auctionForm, title: e.target.value})} />
                <div className="grid grid-cols-2 gap-3"><input type="number" required className="bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none" placeholder="Giá sàn (đ)" value={auctionForm.startingPrice || ''} onChange={e => setAuctionForm({...auctionForm, startingPrice: Number(e.target.value)})} /><input type="datetime-local" required className="bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none" value={auctionForm.endTime} onChange={e => setAuctionForm({...auctionForm, endTime: e.target.value})} /></div>
                <input required className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none" placeholder="Nhà tài trợ vật phẩm" value={auctionForm.donorName} onChange={e => setAuctionForm({...auctionForm, donorName: e.target.value})} />
                <input required className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none" placeholder="Hỗ trợ vùng cao nào?" value={auctionForm.missionLocation} onChange={e => setAuctionForm({...auctionForm, missionLocation: e.target.value})} />
                <div onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setAuctionForm({...auctionForm, image:url}), 800); i.click(); }} className="h-44 border-2 border-dashed border-indigo-100 rounded-3xl flex items-center justify-center cursor-pointer hover:bg-indigo-50 relative overflow-hidden bg-gray-50">
                   {auctionForm.image ? <img src={auctionForm.image} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <span className="text-[9px] font-black uppercase text-indigo-400">Tải ảnh vật phẩm</span>}
                </div>
                <button type="submit" disabled={loading || isProcessingImg} className="w-full bg-indigo-950 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl text-xs">{loading ? 'ĐANG KHỞI TẠO...' : 'BẮT ĐẦU PHIÊN ĐẤU GIÁ'}</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
