
import React, { useState, useEffect } from 'react';
import { CharityMission, User, DonationItem, ChatSession, NeededItem, AuctionItem } from '../types';
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  updateDoc
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
    location: '', description: '', date: '', targetHouseholds: 0, targetBudget: 0, currentBudget: 0, image: ''
  });
  const [neededItems, setNeededItems] = useState<NeededItem[]>([{ name: '', target: 0, current: 0, unit: '' }]);

  // Cập nhật ngân sách nhanh
  const [editingBudget, setEditingBudget] = useState<{id: string, value: number} | null>(null);

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
      setMissionForm({ location: '', description: '', date: '', targetHouseholds: 0, targetBudget: 0, currentBudget: 0, image: '' });
      setNeededItems([{ name: '', target: 0, current: 0, unit: '' }]);
      alert("Đã tạo chuyến cứu trợ mới!");
    } catch (err) { alert(err); }
  };

  const handleUpdateCurrentBudget = async (missionId: string) => {
    if (!editingBudget) return;
    try {
      await updateDoc(doc(db, "missions", missionId), {
        currentBudget: editingBudget.value
      });
      setEditingBudget(null);
      alert("Đã cập nhật số dư chuyến đi!");
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

  const [isAddingAuction, setIsAddingAuction] = useState(false);
  const [auctionForm, setAuctionForm] = useState({
    title: '', description: '', image: '', startingPrice: 0, missionId: '', donorName: '', duration: 3
  });

  const handleGenerateVideo = async (mission: CharityMission) => {
    setIsGeneratingVideo(mission.id);
    const videoUrl = await generateMissionVideo(mission.location);
    if (videoUrl) {
      alert("Đã tạo video AI thành công!");
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
              <p className="text-emerald-300 font-bold text-sm italic">Cập nhật tài chính công khai cho mọi người cùng theo dõi.</p>
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
                        <input type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Mục tiêu hộ dân" value={missionForm.targetHouseholds || ''} onChange={e => setMissionForm({...missionForm, targetHouseholds: parseInt(e.target.value)})} />
                        <input type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Mục tiêu quỹ (VNĐ)" value={missionForm.targetBudget || ''} onChange={e => setMissionForm({...missionForm, targetBudget: parseInt(e.target.value)})} />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <textarea rows={4} className="w-full bg-gray-50 p-4 rounded-2xl font-medium outline-none" placeholder="Mô tả hoàn cảnh..." value={missionForm.description} onChange={e => setMissionForm({...missionForm, description: e.target.value})} />
                      <input className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="URL Hình ảnh" value={missionForm.image} onChange={e => setMissionForm({...missionForm, image: e.target.value})} />
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
              <div key={m.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col gap-6">
                <div className="flex gap-4">
                  <img src={m.image} className="w-24 h-24 rounded-2xl object-cover shadow-md" alt="" />
                  <div className="flex-1">
                    <h4 className="text-lg font-black italic uppercase text-emerald-900">{m.location}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{m.date}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <p className="text-[10px] font-black text-emerald-600 uppercase">Hiện tại: {m.currentBudget.toLocaleString()}đ</p>
                      <button 
                        onClick={() => setEditingBudget({id: m.id, value: m.currentBudget})}
                        className="text-[9px] bg-gray-100 px-2 py-1 rounded-md font-bold text-gray-400 hover:text-emerald-600"
                      >
                        Sửa số dư
                      </button>
                    </div>
                  </div>
                </div>

                {editingBudget?.id === m.id && (
                  <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                    <input 
                      type="number" 
                      className="flex-1 bg-white p-3 rounded-xl text-xs font-black outline-none border border-emerald-100" 
                      value={editingBudget.value} 
                      onChange={e => setEditingBudget({...editingBudget, value: parseInt(e.target.value)})}
                    />
                    <button onClick={() => handleUpdateCurrentBudget(m.id)} className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-[9px] font-black uppercase">Cập nhật</button>
                  </div>
                )}

                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (m.currentBudget / m.targetBudget) * 100)}%` }}></div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleGenerateVideo(m)} className="flex-1 text-[9px] bg-emerald-50 text-emerald-600 py-3 rounded-xl font-black uppercase hover:bg-emerald-600 hover:text-white transition-all">Video AI</button>
                  <button onClick={() => { if(confirm('Xóa chuyến đi này?')) deleteDoc(doc(db, "missions", m.id)) }} className="bg-red-50 text-red-400 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
