
import React, { useState, useEffect } from 'react';
import { CharityMission, User, DonationItem, ChatSession, NeededItem, AuctionItem } from '../types';
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy 
} from "firebase/firestore";
import { db } from '../services/firebase';
import { generateMissionVideo } from '../services/geminiService';

interface AdminProps {
  user: User;
}

const Admin: React.FC<AdminProps> = ({ user }) => {
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [itemsList, setItemsList] = useState<DonationItem[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'missions' | 'auctions' | 'items' | 'stats'>('missions');
  
  // Mission Form States
  const [isAddingMission, setIsAddingMission] = useState(false);
  const [missionForm, setMissionForm] = useState({
    location: '', description: '', date: '', targetHouseholds: 0, targetBudget: 0, image: ''
  });
  const [neededItems, setNeededItems] = useState<NeededItem[]>([{ name: '', target: 0, current: 0, unit: '' }]);

  // Auction Form States
  const [isAddingAuction, setIsAddingAuction] = useState(false);
  const [auctionForm, setAuctionForm] = useState({
    title: '', description: '', image: '', startingPrice: 0, missionId: '', donorName: '', duration: 3
  });

  const [isGeneratingVideo, setIsGeneratingVideo] = useState<string | null>(null);

  useEffect(() => {
    const unsubMissions = onSnapshot(query(collection(db, "missions"), orderBy("createdAt", "desc")), (snap) => {
      setMissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });
    const unsubAuctions = onSnapshot(query(collection(db, "auctions"), orderBy("createdAt", "desc")), (snap) => {
      setAuctions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuctionItem)));
    });
    const unsubItems = onSnapshot(query(collection(db, "items"), orderBy("createdAt", "desc")), (snap) => {
      setItemsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationItem)));
    });
    return () => { unsubMissions(); unsubAuctions(); unsubItems(); };
  }, []);

  const handleAddNeededItem = () => setNeededItems([...neededItems, { name: '', target: 0, current: 0, unit: '' }]);
  
  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "missions"), {
        ...missionForm,
        itemsNeeded: neededItems.filter(i => i.name.trim()),
        status: 'upcoming',
        createdAt: new Date().toISOString()
      });
      setIsAddingMission(false);
      setMissionForm({ location: '', description: '', date: '', targetHouseholds: 0, targetBudget: 0, image: '' });
      setNeededItems([{ name: '', target: 0, current: 0, unit: '' }]);
      alert("Đã tạo chuyến cứu trợ mới!");
    } catch (err) { alert(err); }
  };

  const handleSaveAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedMission = missions.find(m => m.id === auctionForm.missionId);
      const endTime = new Date();
      endTime.setDate(endTime.getDate() + auctionForm.duration);

      await addDoc(collection(db, "auctions"), {
        ...auctionForm,
        missionLocation: selectedMission?.location || 'Chung tay xây dựng',
        currentBid: auctionForm.startingPrice,
        endTime: endTime.toISOString(),
        status: 'active',
        authorId: user.id,
        authorName: user.name,
        createdAt: new Date().toISOString()
      });
      setIsAddingAuction(false);
      alert("Đã mở phiên đấu giá mới!");
    } catch (err) { alert(err); }
  };

  const handleGenerateVideo = async (mission: CharityMission) => {
    setIsGeneratingVideo(mission.id);
    const videoUrl = await generateMissionVideo(mission.location);
    if (videoUrl) {
      // Cập nhật URL video vào Firestore nếu cần
      alert("Đã tạo video AI thành công! Hãy xem trong mục chi tiết chuyến đi.");
    }
    setIsGeneratingVideo(null);
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start mb-10 gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic uppercase">Admin Dashboard</h1>
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-2">Quản lý dự án GIVEBACK</p>
        </div>

        <div className="flex bg-gray-900 p-2 rounded-[2rem] shadow-2xl">
          <button onClick={() => setActiveSubTab('missions')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'missions' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>Vùng cứu trợ</button>
          <button onClick={() => setActiveSubTab('auctions')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'auctions' ? 'bg-amber-600 text-white' : 'text-gray-400'}`}>Đấu giá</button>
          <button onClick={() => setActiveSubTab('items')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'items' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>Bài đăng</button>
        </div>
      </div>

      {activeSubTab === 'missions' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-emerald-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div>
              <h2 className="text-3xl font-black italic uppercase mb-2">Quản lý Chuyến đi Cứu trợ</h2>
              <p className="text-emerald-300 font-bold text-sm italic">Thiết lập mục tiêu để cộng đồng cùng chung tay gây quỹ.</p>
            </div>
            <button onClick={() => setIsAddingMission(true)} className="bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all">Tạo chuyến đi mới</button>
          </div>

          {isAddingMission && (
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-emerald-50 animate-in zoom-in-95">
               <h3 className="text-xl font-black uppercase italic text-emerald-900 mb-8">Thông tin chuyến đi</h3>
               <form onSubmit={handleSaveMission} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" placeholder="Địa điểm (Vd: Mường Lát, Thanh Hóa)" value={missionForm.location} onChange={e => setMissionForm({...missionForm, location: e.target.value})} />
                      <input required type="date" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={missionForm.date} onChange={e => setMissionForm({...missionForm, date: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Số hộ dân dự kiến" value={missionForm.targetHouseholds || ''} onChange={e => setMissionForm({...missionForm, targetHouseholds: parseInt(e.target.value)})} />
                        <input type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Số tiền dự tính (VNĐ)" value={missionForm.targetBudget || ''} onChange={e => setMissionForm({...missionForm, targetBudget: parseInt(e.target.value)})} />
                      </div>
                      <input className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="URL Hình ảnh minh họa" value={missionForm.image} onChange={e => setMissionForm({...missionForm, image: e.target.value})} />
                    </div>
                    <div className="space-y-6">
                      <textarea rows={4} className="w-full bg-gray-50 p-4 rounded-2xl font-medium outline-none" placeholder="Mô tả hoàn cảnh và kế hoạch chuyến đi..." value={missionForm.description} onChange={e => setMissionForm({...missionForm, description: e.target.value})} />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Vật phẩm cần thiết</p>
                        <div className="space-y-3">
                          {neededItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-bold" placeholder="Tên món đồ" value={item.name} onChange={e => {
                                const newItems = [...neededItems];
                                newItems[idx].name = e.target.value;
                                setNeededItems(newItems);
                              }} />
                              <input type="number" className="w-20 bg-gray-50 p-3 rounded-xl text-xs font-bold" placeholder="Số lượng" value={item.target || ''} onChange={e => {
                                const newItems = [...neededItems];
                                newItems[idx].target = parseInt(e.target.value);
                                setNeededItems(newItems);
                              }} />
                              <input className="w-20 bg-gray-50 p-3 rounded-xl text-xs font-bold" placeholder="Đơn vị" value={item.unit} onChange={e => {
                                const newItems = [...neededItems];
                                newItems[idx].unit = e.target.value;
                                setNeededItems(newItems);
                              }} />
                            </div>
                          ))}
                          <button type="button" onClick={handleAddNeededItem} className="text-emerald-600 text-[10px] font-black uppercase">+ Thêm vật phẩm</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4">
                    <button type="button" onClick={() => setIsAddingMission(false)} className="text-gray-400 font-black uppercase tracking-widest text-xs">Hủy bỏ</button>
                    <button type="submit" className="bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl">Lưu chuyến đi</button>
                  </div>
               </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {missions.map(m => (
              <div key={m.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                <img src={m.image} className="w-full md:w-32 h-32 rounded-[2rem] object-cover" alt="" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className="text-lg font-black italic uppercase text-emerald-900">{m.location}</h4>
                    <button onClick={() => { if(confirm('Xóa?')) deleteDoc(doc(db, "missions", m.id)) }} className="text-red-300 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">{m.date} &bull; Dự toán: {m.targetBudget.toLocaleString()}đ</p>
                  <p className="text-xs text-gray-500 italic line-clamp-2 mb-4">"{m.description}"</p>
                  <div className="flex gap-2">
                    <button 
                      disabled={isGeneratingVideo === m.id}
                      onClick={() => handleGenerateVideo(m)}
                      className="text-[10px] bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black uppercase transition-all hover:bg-emerald-600 hover:text-white"
                    >
                      {isGeneratingVideo === m.id ? 'Đang tạo Video AI...' : 'Tạo Video AI'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'auctions' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-amber-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-white/5 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
             <div className="relative z-10">
               <h2 className="text-3xl font-black italic uppercase mb-2 text-amber-100">Quản lý Đấu giá</h2>
               <p className="text-amber-400 font-bold text-sm italic">Chọn chuyến cứu trợ để góp quỹ từ món đồ đấu giá.</p>
             </div>
             <button onClick={() => setIsAddingAuction(true)} className="relative z-10 bg-amber-500 text-amber-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all">Lên sàn món đồ mới</button>
           </div>

           {isAddingAuction && (
             <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-amber-50 animate-in zoom-in-95">
                <h3 className="text-xl font-black uppercase italic text-amber-900 mb-8">Chi tiết món đồ đấu giá</h3>
                <form onSubmit={handleSaveAuction} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Tên món đồ" value={auctionForm.title} onChange={e => setAuctionForm({...auctionForm, title: e.target.value})} />
                      <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Tên nhà tài trợ" value={auctionForm.donorName} onChange={e => setAuctionForm({...auctionForm, donorName: e.target.value})} />
                      <textarea rows={4} className="w-full bg-gray-50 p-4 rounded-2xl font-medium outline-none" placeholder="Mô tả giá trị vật phẩm" value={auctionForm.description} onChange={e => setAuctionForm({...auctionForm, description: e.target.value})} />
                   </div>
                   <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Góp quỹ cho chuyến cứu trợ:</label>
                        <select required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-amber-500" value={auctionForm.missionId} onChange={e => setAuctionForm({...auctionForm, missionId: e.target.value})}>
                          <option value="">Chọn một vùng cứu trợ</option>
                          {missions.map(m => <option key={m.id} value={m.id}>{m.location}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Giá khởi điểm" value={auctionForm.startingPrice || ''} onChange={e => setAuctionForm({...auctionForm, startingPrice: parseInt(e.target.value)})} />
                        <input type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Số ngày (3-10)" value={auctionForm.duration || ''} onChange={e => setAuctionForm({...auctionForm, duration: parseInt(e.target.value)})} />
                      </div>
                      <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Link hình ảnh" value={auctionForm.image} onChange={e => setAuctionForm({...auctionForm, image: e.target.value})} />
                      <button type="submit" className="w-full bg-amber-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl">Kích hoạt đấu giá</button>
                   </div>
                </form>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctions.map(a => (
                <div key={a.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                   <div className="flex items-start gap-4">
                      <img src={a.image} className="w-20 h-20 rounded-2xl object-cover" alt="" />
                      <div>
                         <h5 className="font-black text-sm uppercase italic text-gray-900 leading-tight">{a.title}</h5>
                         <p className="text-[9px] font-bold text-amber-600 uppercase mt-1">Góp cho: {a.missionLocation}</p>
                         <p className="text-[10px] font-black text-gray-400 mt-2">{a.currentBid.toLocaleString()}đ</p>
                      </div>
                   </div>
                   <button onClick={() => { if(confirm('Dừng?')) deleteDoc(doc(db, "auctions", a.id)) }} className="absolute top-4 right-4 text-red-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
