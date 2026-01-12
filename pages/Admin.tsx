
import React, { useState, useEffect, useRef } from 'react';
import { CharityMission, User, AuctionItem, NeededItem, SocialPost, Sponsor } from '../types';
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  doc, 
  orderBy,
  updateDoc,
  deleteDoc,
  getDocs,
  where,
  limit
} from "firebase/firestore";
import { db } from '../services/firebase';

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

  // --- FORM STATES ---
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [missionForm, setMissionForm] = useState({
    location: '', description: '', date: '', targetHouseholds: 0, targetBudget: 0, image: ''
  });

  const [isAuctionModalOpen, setIsAuctionModalOpen] = useState(false);
  const [auctionForm, setAuctionForm] = useState({
    title: '', description: '', startingPrice: 0, endTime: '', missionLocation: '', donorName: '', image: ''
  });

  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [sponsorForm, setSponsorForm] = useState<Partial<Sponsor>>({
    name: '', avatar: '', type: 'individual', message: '', totalMoney: 0, totalItemsCount: 0, rank: 'bronze'
  });

  useEffect(() => {
    const unsubMissions = onSnapshot(query(collection(db, "missions"), orderBy("createdAt", "desc")), (snap) => {
      setMissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });
    
    // Cực kỳ quan trọng: Lắng nghe sponsors
    const unsubSponsors = onSnapshot(query(collection(db, "sponsors")), (snap) => {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result as string || '');
      reader.readAsDataURL(file);
    }
  };

  const getSafeImg = (src?: string) => {
    if (src && src.trim() !== "") return src;
    return "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=400";
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalData = {
        name: sponsorForm.name?.trim() || "Nhà hảo tâm",
        avatar: sponsorForm.avatar || "",
        type: sponsorForm.type || 'individual',
        message: sponsorForm.message?.trim() || "Lan tỏa yêu thương cùng GIVEBACK.",
        totalMoney: Number(sponsorForm.totalMoney) || 0,
        totalItemsCount: Number(sponsorForm.totalItemsCount) || 0,
        rank: sponsorForm.rank || 'bronze',
        createdAt: new Date().toISOString(),
        history: []
      };

      await addDoc(collection(db, "sponsors"), finalData);
      
      setIsSponsorModalOpen(false);
      setSponsorForm({ name: '', avatar: '', type: 'individual', message: '', totalMoney: 0, totalItemsCount: 0, rank: 'bronze' });
      onNotify('success', `Đã vinh danh ${finalData.name} lên Bảng Vàng!`, 'Admin');
      
      // Chuyển tab để đệ thấy kết quả ngay
      setActiveSubTab('sponsors');
    } catch (err) { 
      console.error(err);
      onNotify('error', "Lỗi vinh danh."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "auctions"), {
        ...auctionForm,
        currentBid: Number(auctionForm.startingPrice) || 0,
        status: 'active', authorId: user.id, authorName: user.name, createdAt: new Date().toISOString()
      });
      setIsAuctionModalOpen(false);
      setAuctionForm({ title: '', description: '', startingPrice: 0, endTime: '', missionLocation: '', donorName: '', image: '' });
      onNotify('success', `Đấu giá "${auctionForm.title}" đã lên sàn!`, 'Admin');
    } catch (err) { onNotify('error', "Lỗi tạo đấu giá."); } finally { setLoading(false); }
  };

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { 
        location: missionForm.location,
        description: missionForm.description,
        date: missionForm.date,
        targetHouseholds: Number(missionForm.targetHouseholds) || 0,
        targetBudget: Number(missionForm.targetBudget) || 0,
        image: missionForm.image,
        updatedAt: new Date().toISOString() 
      };

      if (editingMissionId) {
        await updateDoc(doc(db, "missions", editingMissionId), data);
        onNotify('success', `Cập nhật ${missionForm.location} thành công!`, 'Admin');
      } else {
        await addDoc(collection(db, "missions"), { 
          ...data, 
          currentBudget: 0, 
          itemsNeeded: [], 
          status: 'upcoming', 
          createdAt: new Date().toISOString() 
        });
        onNotify('success', `Đã khởi tạo hành trình ${missionForm.location}!`, 'Admin');
      }
      setIsMissionModalOpen(false);
      setEditingMissionId(null);
    } catch (err) { onNotify('error', "Lỗi lưu sứ mệnh."); } finally { setLoading(false); }
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
           <div className="bg-emerald-900 p-8 md:p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden">
             <div className="relative z-10 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-black italic uppercase mb-2">Chuyến cứu trợ</h2>
                <p className="text-emerald-300 font-bold text-xs md:text-sm italic">Quản lý ngân sách và sứ mệnh vùng cao.</p>
             </div>
             <button onClick={() => { setEditingMissionId(null); setMissionForm({ location: '', description: '', date: '', targetHouseholds: 0, targetBudget: 0, image: '' }); setIsMissionModalOpen(true); }} className="relative z-10 bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Tạo mới</button>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {missions.map(m => (
               <div key={m.id} className="bg-white p-5 md:p-6 rounded-[3rem] shadow-sm border border-gray-100 flex gap-4 md:gap-6 group">
                  <img src={getSafeImg(m.image)} className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] object-cover shadow-lg bg-gray-100" alt="" />
                  <div className="flex-1 min-w-0">
                     <h4 className="text-xl md:text-2xl font-black italic uppercase text-emerald-950 truncate mb-1">{m.location}</h4>
                     <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">{new Date(m.date).toLocaleDateString()}</p>
                     <div className="flex gap-2">
                        <button onClick={() => { 
                          setEditingMissionId(m.id); 
                          setMissionForm({ 
                            location: m.location, 
                            description: m.description, 
                            date: m.date, 
                            targetHouseholds: m.targetHouseholds || 0, 
                            targetBudget: m.targetBudget, 
                            image: m.image 
                          }); 
                          setIsMissionModalOpen(true); 
                        }} className="flex-1 bg-emerald-100 text-emerald-700 py-3 rounded-2xl font-black uppercase text-[8px] tracking-widest">Sửa</button>
                        <button onClick={() => { if(window.confirm("Xóa?")) deleteDoc(doc(db, "missions", m.id)) }} className="p-3 bg-red-50 text-red-400 rounded-2xl hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                     </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeSubTab === 'sponsors' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-amber-900 p-8 md:p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden">
             <div className="relative z-10 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-black italic uppercase mb-2">Vinh danh cộng đồng</h2>
                <p className="text-amber-300 font-bold text-xs md:text-sm italic">Quản lý Bảng Vàng tri ân những tấm lòng vàng.</p>
             </div>
             <button onClick={() => { setSponsorForm({ name: '', avatar: '', type: 'individual', message: '', totalMoney: 0, totalItemsCount: 0, rank: 'bronze' }); setIsSponsorModalOpen(true); }} className="relative z-10 bg-white text-amber-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Thêm vinh danh</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {sponsors.map(s => (
                <div key={s.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col items-center text-center group">
                   <img src={getSafeImg(s.avatar)} className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover mb-4 shadow-md bg-gray-100" alt="" />
                   <h4 className="font-black text-sm uppercase italic text-emerald-950 truncate w-full">{s.name}</h4>
                   <p className="text-[8px] text-amber-600 font-bold uppercase mb-4 tracking-widest">{(s.rank || 'bronze').toUpperCase()}</p>
                   <button onClick={() => { if(window.confirm("Gỡ vinh danh này?")) deleteDoc(doc(db, "sponsors", s.id)) }} className="text-[10px] text-red-500 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Gỡ vinh danh</button>
                </div>
              ))}
              {sponsors.length === 0 && (
                <div className="col-span-full py-10 text-center opacity-30">
                  <p className="text-[9px] font-black uppercase tracking-widest italic">Chưa có ai trong danh sách...</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* --- CÁC TAB KHÁC --- */}
      {activeSubTab === 'auctions' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-indigo-900 p-8 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden">
             <div className="relative z-10 text-center md:text-left">
                <h2 className="text-2xl font-black italic uppercase mb-2">Đấu giá</h2>
                <p className="text-indigo-300 font-bold text-xs italic">Điều phối các vật phẩm đấu giá gây quỹ.</p>
             </div>
             <button onClick={() => setIsAuctionModalOpen(true)} className="relative z-10 bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl mt-4 md:mt-0">Lên sàn</button>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {auctions.map(a => (
               <div key={a.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 flex gap-6 group">
                  <img src={getSafeImg(a.image)} className="w-24 h-24 rounded-[2rem] object-cover shadow-lg bg-gray-100" alt="" />
                  <div className="flex-1 min-w-0">
                     <h4 className="text-lg font-black italic uppercase text-indigo-950 truncate leading-none mb-1">{a.title}</h4>
                     <p className="text-[10px] text-gray-400 font-bold mb-4 uppercase tracking-widest">{a.missionLocation}</p>
                     <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-indigo-700">{(a.currentBid || 0).toLocaleString()}đ</p>
                        <button onClick={() => { if(window.confirm("Xóa?")) deleteDoc(doc(db, "auctions", a.id)) }} className="bg-red-50 text-red-500 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                     </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeSubTab === 'posts' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.3em] px-4">Kiểm duyệt ({socialPosts.length})</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {socialPosts.map(post => (
                <div key={post.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col gap-4 group">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <img src={getSafeImg(post.authorAvatar)} className="w-10 h-10 rounded-xl object-cover bg-gray-50" alt="" />
                         <div><p className="font-black text-xs uppercase italic tracking-tighter">{post.authorName}</p><p className="text-[8px] text-gray-400 font-bold uppercase">{new Date(post.createdAt).toLocaleDateString()}</p></div>
                      </div>
                      <button onClick={() => { if(window.confirm("Gỡ bài?")) deleteDoc(doc(db, "social_posts", post.id)) }} className="bg-red-50 text-red-500 p-3 rounded-2xl hover:bg-red-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                   </div>
                   <p className="text-xs text-gray-700 italic leading-relaxed line-clamp-3">"{post.content}"</p>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {isSponsorModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 py-10 overflow-y-auto">
          <div className="absolute inset-0 bg-amber-950/90 backdrop-blur-md" onClick={() => setIsSponsorModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in-95">
             <h3 className="text-2xl font-black uppercase italic text-amber-900 mb-8 text-center">Vinh danh cộng đồng</h3>
             <form onSubmit={handleSaveSponsor} className="space-y-5">
                <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-amber-500 transition-all" placeholder="Tên cá nhân/tổ chức" value={sponsorForm.name} onChange={e => setSponsorForm({...sponsorForm, name: e.target.value})} />
                <div onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setSponsorForm({...sponsorForm, avatar:url})); i.click(); }} className="w-full border-2 border-dashed border-amber-100 p-6 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-amber-50">
                   {sponsorForm.avatar ? <img src={sponsorForm.avatar} className="w-20 h-20 rounded-xl object-cover" alt="" /> : <span className="text-[9px] font-black uppercase text-amber-600">Chọn Ảnh Đại Diện (Vinh danh)</span>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select className="bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={sponsorForm.rank} onChange={e => setSponsorForm({...sponsorForm, rank: e.target.value as any})}>
                    <option value="gold">Hạng Vàng</option><option value="silver">Hạng Bạc</option><option value="bronze">Hạng Đồng</option>
                  </select>
                  <select className="bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={sponsorForm.type} onChange={e => setSponsorForm({...sponsorForm, type: e.target.value as any})}>
                    <option value="individual">Cá nhân</option><option value="organization">Tổ chức</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" className="bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Tiền mặt (VNĐ)" value={sponsorForm.totalMoney || ''} onChange={e => setSponsorForm({...sponsorForm, totalMoney: parseInt(e.target.value) || 0})} />
                   <input type="number" className="bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Hiện vật (Số lượng)" value={sponsorForm.totalItemsCount || ''} onChange={e => setSponsorForm({...sponsorForm, totalItemsCount: parseInt(e.target.value) || 0})} />
                </div>
                <textarea rows={2} className="w-full bg-gray-50 p-4 rounded-2xl font-medium italic outline-none" placeholder="Lời tri ân ngắn..." value={sponsorForm.message} onChange={e => setSponsorForm({...sponsorForm, message: e.target.value})} />
                <button type="submit" disabled={loading} className="w-full bg-amber-600 text-white py-5 rounded-2xl font-black uppercase shadow-xl">{loading ? 'Đang vinh danh...' : 'XÁC NHẬN VINH DANH'}</button>
             </form>
          </div>
        </div>
      )}

      {isAuctionModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 py-10 overflow-y-auto">
          <div className="absolute inset-0 bg-indigo-950/90 backdrop-blur-md" onClick={() => setIsAuctionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in-95">
             <h3 className="text-2xl font-black uppercase italic text-indigo-900 mb-8">Kích hoạt Đấu giá</h3>
             <form onSubmit={handleCreateAuction} className="space-y-5">
                <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500" placeholder="Tên vật phẩm" value={auctionForm.title} onChange={e => setAuctionForm({...auctionForm, title: e.target.value})} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <input type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Giá sàn" value={auctionForm.startingPrice || ''} onChange={e => setAuctionForm({...auctionForm, startingPrice: parseInt(e.target.value) || 0})} />
                      <input type="datetime-local" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={auctionForm.endTime} onChange={e => setAuctionForm({...auctionForm, endTime: e.target.value})} />
                      <input className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Người tặng" value={auctionForm.donorName} onChange={e => setAuctionForm({...auctionForm, donorName: e.target.value})} />
                      <input className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Cho chiến dịch..." value={auctionForm.missionLocation} onChange={e => setAuctionForm({...auctionForm, missionLocation: e.target.value})} />
                   </div>
                   <div onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setAuctionForm({...auctionForm, image:url})); i.click(); }} className="border-2 border-dashed border-indigo-100 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 relative overflow-hidden min-h-[200px]">
                      {auctionForm.image ? <img src={auctionForm.image} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <p className="text-[9px] font-black text-indigo-600 uppercase">Ảnh vật phẩm</p>}
                   </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-indigo-900 text-white py-5 rounded-2xl font-black uppercase shadow-xl">BẮT ĐẦU</button>
             </form>
          </div>
        </div>
      )}

      {isMissionModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 py-10 overflow-y-auto">
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md" onClick={() => setIsMissionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in-95">
             <h3 className="text-2xl font-black uppercase italic text-emerald-900 mb-8">{editingMissionId ? 'Sửa' : 'Tạo'} Chiến dịch</h3>
             <form onSubmit={handleSaveMission} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" placeholder="Vùng cứu trợ" value={missionForm.location} onChange={e => setMissionForm({...missionForm, location: e.target.value})} />
                      <input type="date" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={missionForm.date} onChange={e => setMissionForm({...missionForm, date: e.target.value})} />
                      <input type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Ngân sách (VNĐ)" value={missionForm.targetBudget || ''} onChange={e => setMissionForm({...missionForm, targetBudget: parseInt(e.target.value) || 0})} />
                   </div>
                   <div onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any)=>handleFileUpload(e, (url)=>setMissionForm({...missionForm, image:url})); i.click(); }} className="border-2 border-dashed border-emerald-100 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 relative overflow-hidden min-h-[160px]">
                      {missionForm.image ? <img src={missionForm.image} className="absolute inset-0 w-full h-full object-cover" alt="" /> : <p className="text-[9px] font-black text-emerald-600 uppercase">Ảnh bìa</p>}
                   </div>
                </div>
                <textarea required rows={2} className="w-full bg-gray-50 p-4 rounded-2xl font-medium italic outline-none" placeholder="Mô tả sứ mệnh..." value={missionForm.description} onChange={e => setMissionForm({...missionForm, description: e.target.value})} />
                <button type="submit" disabled={loading} className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-black uppercase shadow-xl">XÁC NHẬN</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
