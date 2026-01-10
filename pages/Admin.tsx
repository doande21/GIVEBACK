
import React, { useState, useEffect, useRef } from 'react';
import { CharityMission, User, DonationItem, ChatSession, ChatMessage, NeededItem, Sponsor } from '../types';
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

interface AdminProps {
  user: User;
}

const Admin: React.FC<AdminProps> = ({ user }) => {
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [itemsList, setItemsList] = useState<DonationItem[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'missions' | 'users' | 'items' | 'chats'>('missions');
  
  // Mission Form States
  const [isAddingMission, setIsAddingMission] = useState(false);
  const [missionForm, setMissionForm] = useState({
    location: '',
    description: '',
    image: '',
    targetHouseholds: 0,
    date: new Date().toISOString().split('T')[0],
    itemsNeeded: [] as NeededItem[],
    sponsors: [] as Sponsor[]
  });

  // Items Helper States
  const [newItemName, setNewItemName] = useState('');
  const [newItemTarget, setNewItemTarget] = useState(0);
  const [newItemUnit, setNewItemUnit] = useState('');

  // Sponsors Helper States
  const [newSponsorName, setNewSponsorName] = useState('');
  const [newSponsorLogo, setNewSponsorLogo] = useState('');

  // Admin Chat Monitoring
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    const qMissions = query(collection(db, "missions"), orderBy("createdAt", "desc"));
    const unsubMissions = onSnapshot(qMissions, (snapshot) => {
      setMissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });

    const qItems = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const unsubItems = onSnapshot(qItems, (snapshot) => {
      setItemsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationItem)));
    });

    const qChats = query(collection(db, "chats"), orderBy("updatedAt", "desc"));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      setChatSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession)));
    });

    return () => { unsubMissions(); unsubItems(); unsubChats(); };
  }, []);

  useEffect(() => {
    if (selectedChat) {
      const q = query(collection(db, "chats", selectedChat.id, "messages"), orderBy("createdAt", "asc"));
      const unsub = onSnapshot(q, (snapshot) => {
        setChatMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      });
      return unsub;
    }
  }, [selectedChat]);

  const handleAddNeededItem = () => {
    if (!newItemName || newItemTarget <= 0 || !newItemUnit) return;
    setMissionForm(prev => ({
      ...prev,
      itemsNeeded: [...prev.itemsNeeded, { name: newItemName, target: newItemTarget, current: 0, unit: newItemUnit }]
    }));
    setNewItemName('');
    setNewItemTarget(0);
    setNewItemUnit('');
  };

  const handleAddSponsor = () => {
    if (!newSponsorName || !newSponsorLogo) return;
    setMissionForm(prev => ({
      ...prev,
      sponsors: [...prev.sponsors, { name: newSponsorName, logo: newSponsorLogo }]
    }));
    setNewSponsorName('');
    setNewSponsorLogo('');
  };

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "missions"), {
        ...missionForm,
        status: 'upcoming',
        createdAt: new Date().toISOString()
      });
      setIsAddingMission(false);
      setMissionForm({ location: '', description: '', image: '', targetHouseholds: 0, date: new Date().toISOString().split('T')[0], itemsNeeded: [], sponsors: [] });
    } catch (err) { alert(err); }
  };

  const handleDeleteMission = async (id: string) => {
    if (window.confirm("Admin Đệ chắc chắn muốn xóa lịch trình này?")) {
      await deleteDoc(doc(db, "missions", id));
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase">
            {isAdmin ? 'Quản trị GIVEBACK' : 'Tin từ thiện'}
          </h1>
          <p className="text-emerald-600 mt-1 font-black text-xs uppercase tracking-widest">
            {isAdmin ? 'Công cụ quản lý dự án' : 'Hành trình kết nối những tấm lòng'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner">
            <button onClick={() => setActiveSubTab('missions')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeSubTab === 'missions' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Cứu trợ</button>
            <button onClick={() => setActiveSubTab('items')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeSubTab === 'items' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Món đồ</button>
            <button onClick={() => setActiveSubTab('chats')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeSubTab === 'chats' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Trò chuyện</button>
          </div>
        )}
      </div>

      {activeSubTab === 'missions' && (
        <div className="space-y-12">
          {isAdmin && !isAddingMission && (
            <button 
              onClick={() => setIsAddingMission(true)}
              className="w-full py-6 border-4 border-dashed border-emerald-100 rounded-[2.5rem] flex flex-col items-center justify-center text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
            >
              <div className="bg-emerald-100 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              </div>
              <span className="font-black uppercase text-xs tracking-widest">Tạo đợt cứu trợ mới</span>
            </button>
          )}

          {isAddingMission && (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[85vh]">
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-10 py-2">
                <h2 className="text-xl font-black uppercase italic text-emerald-900 tracking-tight">Chi tiết đợt cứu trợ</h2>
                <button onClick={() => setIsAddingMission(false)} className="text-gray-400 hover:text-red-500">Hủy bỏ</button>
              </div>
              <form onSubmit={handleSaveMission} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Địa điểm (Xã/Huyện/Tỉnh)</label>
                      <input required className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={missionForm.location} onChange={e => setMissionForm({...missionForm, location: e.target.value})} placeholder="Vd: Vân Canh, Gia Lai" />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Số lượng hộ dân dự kiến</label>
                      <input required type="number" className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={missionForm.targetHouseholds} onChange={e => setMissionForm({...missionForm, targetHouseholds: parseInt(e.target.value)})} placeholder="Vd: 150" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Mô tả hoàn cảnh chuyến đi</label>
                    <textarea required rows={3} className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-emerald-500 font-medium" value={missionForm.description} onChange={e => setMissionForm({...missionForm, description: e.target.value})} placeholder="Vd: Trao tặng quà cho bà con làng Kà Nâu..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Link ảnh minh họa khu vực</label>
                    <input required className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-emerald-500 font-medium" value={missionForm.image} onChange={e => setMissionForm({...missionForm, image: e.target.value})} placeholder="Dán link ảnh tại đây..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Ngày dự kiến xuất phát</label>
                    <input type="date" required className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={missionForm.date} onChange={e => setMissionForm({...missionForm, date: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100">
                    <h3 className="text-xs font-black uppercase text-emerald-900 mb-4 tracking-widest">Nhu yếu phẩm cần cho {missionForm.targetHouseholds || 0} hộ</h3>
                    <div className="space-y-3 mb-6">
                      {missionForm.itemsNeeded.map((item, idx) => (
                        <div key={idx} className="bg-white px-4 py-2 rounded-xl flex justify-between items-center text-xs font-bold border border-emerald-50 shadow-sm">
                          <span>{item.name}</span>
                          <span className="text-emerald-600">{item.target} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input className="px-3 py-2 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Tên món" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                      <input type="number" className="px-3 py-2 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500" placeholder="SL" value={newItemTarget} onChange={e => setNewItemTarget(parseInt(e.target.value))} />
                      <input className="px-3 py-2 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500" placeholder="ĐVT" value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} />
                    </div>
                    <button type="button" onClick={handleAddNeededItem} className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700">Thêm vào danh sách</button>
                  </div>

                  <div className="bg-emerald-900 p-6 rounded-[2rem] text-white">
                    <h3 className="text-xs font-black uppercase text-emerald-100 mb-4 tracking-widest">Nhà tài trợ & Đối tác đồng hành</h3>
                    <div className="flex flex-wrap gap-3 mb-6">
                      {missionForm.sponsors.map((sp, idx) => (
                        <div key={idx} className="bg-white/10 p-2 rounded-xl flex items-center space-x-3 border border-white/20">
                          <img src={sp.logo} className="w-8 h-8 rounded-lg object-contain bg-white p-1" alt="" />
                          <span className="text-[10px] font-black uppercase">{sp.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <input className="w-full px-4 py-2 rounded-xl text-xs font-bold text-gray-900 outline-none" placeholder="Tên cá nhân/doanh nghiệp" value={newSponsorName} onChange={e => setNewSponsorName(e.target.value)} />
                      <input className="w-full px-4 py-2 rounded-xl text-xs font-bold text-gray-900 outline-none" placeholder="Link Logo (PNG/JPG)" value={newSponsorLogo} onChange={e => setNewSponsorLogo(e.target.value)} />
                      <button type="button" onClick={handleAddSponsor} className="w-full py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400">Vinh danh nhà tài trợ</button>
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-2 flex justify-end pt-6 border-t">
                  <button type="submit" className="bg-emerald-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">Hoàn tất đăng tin</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {missions.map(mission => (
              <div key={mission.id} className="group bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col hover:-translate-y-2 transition-all duration-300">
                <div className="h-64 relative overflow-hidden">
                  <img src={mission.image || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2070&auto=format&fit=crop'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={mission.location} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                  
                  {/* Household Badge */}
                  <div className="absolute top-6 left-8">
                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center space-x-2 border-2 border-emerald-500/20">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Hỗ trợ {mission.targetHouseholds || 0} hộ dân</span>
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-8 right-8">
                    <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest mb-2 inline-block">Sắp diễn ra</span>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter line-clamp-1">{mission.location}</h3>
                  </div>

                  {isAdmin && (
                    <button onClick={() => handleDeleteMission(mission.id)} className="absolute top-6 right-6 p-3 bg-red-500/80 text-white rounded-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
                
                <div className="p-8 flex-1 flex flex-col">
                  {/* Sponsors Section */}
                  {mission.sponsors && mission.sponsors.length > 0 && (
                    <div className="mb-6">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Đồng hành cùng chuyến đi</p>
                      <div className="flex flex-wrap gap-2">
                        {mission.sponsors.map((sp, idx) => (
                          <div key={idx} className="group/sp relative">
                            <img src={sp.logo} className="w-10 h-10 rounded-full object-contain bg-white border border-gray-100 shadow-sm p-1.5 hover:scale-110 transition-transform" alt={sp.name} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] font-black uppercase rounded opacity-0 group-hover/sp:opacity-100 transition-opacity whitespace-nowrap z-20">
                              {sp.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Kế hoạch hỗ trợ
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed italic border-l-4 border-emerald-100 pl-4 font-medium">"{mission.description}"</p>
                  </div>
                  
                  <div className="space-y-6 flex-1 bg-gray-50/50 p-6 rounded-[2rem] border border-emerald-50">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex justify-between items-center">
                      <span>Nhu yếu phẩm huy động</span>
                      <span className="text-emerald-500 italic lowercase">{mission.targetHouseholds} hộ dân</span>
                    </h4>
                    {mission.itemsNeeded.map((item, idx) => {
                      const progress = Math.min((item.current / item.target) * 100, 100);
                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-gray-800">{item.name}</span>
                            <span className="text-emerald-600 uppercase italic font-black">{item.current}/{item.target} {item.unit}</span>
                          </div>
                          <div className="h-2 w-full bg-white rounded-full overflow-hidden shadow-inner border border-emerald-100/30">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Xuất phát</span>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-xs font-black text-gray-900">{new Date(mission.date).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                    <button className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all">Quyên góp ngay</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Món đồ */}
      {activeSubTab === 'items' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
           <table className="w-full text-left">
              <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-400">
                <tr><th className="p-8">Món đồ</th><th className="p-8">Số lượng</th><th className="p-8">Hành động</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {itemsList.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-8">
                       <div className="flex items-center space-x-4">
                          <img src={item.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                          <div>
                            <p className="font-bold text-gray-900">{item.title}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Đăng bởi {item.author}</p>
                          </div>
                       </div>
                    </td>
                    <td className="p-8">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.quantity <= 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        {item.quantity} món
                      </span>
                    </td>
                    <td className="p-8">
                      <button className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all" onClick={() => deleteDoc(doc(db, "items", item.id))}>Xóa bài</button>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}

      {/* Tab Chat Giám Sát */}
      {activeSubTab === 'chats' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[70vh]">
          {/* Sidebar */}
          <div className="lg:col-span-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-emerald-50/20">
              <h2 className="text-xs font-black uppercase italic text-emerald-900 tracking-widest">Giám sát hội thoại</h2>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {chatSessions.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => setSelectedChat(chat)}
                  className={`p-6 cursor-pointer transition-all ${selectedChat?.id === chat.id ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'hover:bg-gray-50'}`}
                >
                  <p className="text-xs font-black text-gray-900 mb-1">{chat.itemTitle}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{chat.donorName} &rarr; {chat.receiverName}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat content */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col relative">
            {selectedChat ? (
              <>
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                  <h3 className="text-sm font-black text-emerald-900 uppercase italic">{selectedChat.itemTitle}</h3>
                  <button onClick={() => {if(window.confirm("Xóa chat này?")) deleteDoc(doc(db, "chats", selectedChat.id))}} className="text-red-500 hover:bg-red-50 p-2 rounded-xl">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-gray-50/30">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.senderId === selectedChat.donorId ? 'items-start' : 'items-end'}`}>
                       <span className="text-[8px] font-black text-gray-400 uppercase mb-1">{m.senderName}</span>
                       <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-[80%] shadow-sm ${m.senderId === selectedChat.donorId ? 'bg-white text-gray-700 rounded-tl-none border border-gray-100' : 'bg-emerald-600 text-white rounded-tr-none'}`}>
                         {m.text}
                       </div>
                    </div>
                  ))}
                  <div ref={chatEndRef}></div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-200">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                 <p className="font-black uppercase tracking-[0.3em] text-sm italic">Chọn phiên giám sát</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
