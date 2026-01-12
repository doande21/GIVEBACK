
import React, { useState, useEffect, useRef } from 'react';
import { CharityMission, User, AuctionItem, NeededItem, DonationItem, SocialPost } from '../types';
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  doc, 
  orderBy,
  updateDoc,
  runTransaction,
  deleteDoc
} from "firebase/firestore";
import { db } from '../services/firebase';

interface AdminProps {
  user: User;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
}

const Admin: React.FC<AdminProps> = ({ user, onNotify }) => {
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [userItems, setUserItems] = useState<DonationItem[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  
  const [activeSubTab, setActiveSubTab] = useState<'missions' | 'auctions' | 'posts' | 'stats'>('missions');
  const [postFilter, setPostFilter] = useState<'market' | 'social'>('market');
  
  // File Input Refs
  const missionImageRef = useRef<HTMLInputElement>(null);
  const auctionImageRef = useRef<HTMLInputElement>(null);

  // Mission Form States
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [missionForm, setMissionForm] = useState({
    location: '', description: '', date: '', targetHouseholds: 0, targetBudget: 0, currentBudget: 0, image: ''
  });
  const [neededItems, setNeededItems] = useState<NeededItem[]>([{ name: '', target: 0, current: 0, unit: '' }]);

  // Auction Form States
  const [isAuctionModalOpen, setIsAuctionModalOpen] = useState(false);
  const [editingAuctionId, setEditingAuctionId] = useState<string | null>(null);
  const [auctionForm, setAuctionForm] = useState({
    title: '', description: '', image: '', startingPrice: 0, endTime: '', missionLocation: '', donorName: ''
  });

  // Other States
  const [loggingDonationFor, setLoggingDonationFor] = useState<CharityMission | null>(null);
  const [donationLogForm, setDonationLogForm] = useState({ donorName: '', amount: 0, message: '' });
  const [updatingItemsFor, setUpdatingItemsFor] = useState<CharityMission | null>(null);
  const [itemUpdates, setItemUpdates] = useState<NeededItem[]>([]);

  useEffect(() => {
    const unsubMissions = onSnapshot(query(collection(db, "missions"), orderBy("createdAt", "desc")), (snap) => {
      setMissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
    });
    
    const unsubAuctions = onSnapshot(query(collection(db, "auctions"), orderBy("createdAt", "desc")), (snap) => {
      setAuctions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuctionItem)));
    });

    const unsubItems = onSnapshot(query(collection(db, "items"), orderBy("createdAt", "desc")), (snap) => {
      setUserItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationItem)));
    });

    const unsubPosts = onSnapshot(query(collection(db, "social_posts"), orderBy("createdAt", "desc")), (snap) => {
      setSocialPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPost)));
    });

    return () => {
      unsubMissions();
      unsubAuctions();
      unsubItems();
      unsubPosts();
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'mission' | 'auction') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        onNotify('warning', "Ảnh lớn hơn 2MB rồi đệ ơi! Hãy chọn ảnh nhẹ hơn nhé.", "Hệ thống");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'mission') {
          setMissionForm(prev => ({ ...prev, image: base64 }));
        } else {
          setAuctionForm(prev => ({ ...prev, image: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Handlers ---
  const handleDeleteUserItem = async (id: string, title: string) => {
    if (window.confirm(`Gỡ vĩnh viễn bài tặng đồ "${title}"?`)) {
      try {
        await deleteDoc(doc(db, "items", id));
        onNotify('info', `Đã gỡ bài tặng đồ: ${title}`, 'Admin');
      } catch (err) { onNotify('error', "Lỗi: " + err); }
    }
  };

  const handleDeleteSocialPost = async (id: string) => {
    if (window.confirm(`Xóa bài đăng này khỏi Bảng tin?`)) {
      try {
        await deleteDoc(doc(db, "social_posts", id));
        onNotify('info', `Đã xóa bài đăng mạng xã hội`, 'Admin');
      } catch (err) { onNotify('error', "Lỗi: " + err); }
    }
  };

  const handleOpenCreateMission = () => {
    setEditingMissionId(null);
    setMissionForm({ location: '', description: '', date: '', targetHouseholds: 0, targetBudget: 0, currentBudget: 0, image: '' });
    setNeededItems([{ name: '', target: 0, current: 0, unit: '' }]);
    setIsMissionModalOpen(true);
  };

  const handleOpenEditMission = (m: CharityMission) => {
    setEditingMissionId(m.id);
    setMissionForm({
      location: m.location,
      description: m.description,
      date: m.date,
      targetHouseholds: m.targetHouseholds || 0,
      targetBudget: m.targetBudget || 0,
      currentBudget: m.currentBudget || 0,
      image: m.image || ''
    });
    setNeededItems(m.itemsNeeded && m.itemsNeeded.length > 0 ? [...m.itemsNeeded] : [{ name: '', target: 0, current: 0, unit: '' }]);
    setIsMissionModalOpen(true);
  };

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const missionData = {
        ...missionForm,
        itemsNeeded: neededItems.filter(i => i.name.trim()),
        status: 'upcoming',
        updatedAt: new Date().toISOString()
      };
      if (editingMissionId) {
        await updateDoc(doc(db, "missions", editingMissionId), missionData);
        onNotify('success', `Cập nhật thành công chuyến đi tại ${missionForm.location}!`, 'Admin');
      } else {
        await addDoc(collection(db, "missions"), { ...missionData, createdAt: new Date().toISOString() });
        onNotify('success', `Đã tạo chuyến cứu trợ mới tại ${missionForm.location}!`, 'Admin');
      }
      setIsMissionModalOpen(false);
    } catch (err) { onNotify('error', "Lỗi: " + String(err)); }
  };

  const handleOpenCreateAuction = () => {
    setEditingAuctionId(null);
    setAuctionForm({ title: '', description: '', image: '', startingPrice: 0, endTime: '', missionLocation: '', donorName: '' });
    setIsAuctionModalOpen(true);
  };

  const handleOpenEditAuction = (a: AuctionItem) => {
    setEditingAuctionId(a.id);
    setAuctionForm({
      title: a.title,
      description: a.description,
      image: a.image,
      startingPrice: a.startingPrice,
      endTime: a.endTime,
      missionLocation: a.missionLocation,
      donorName: a.donorName
    });
    setIsAuctionModalOpen(true);
  };

  const handleSaveAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const auctionData = {
        ...auctionForm,
        currentBid: auctionForm.startingPrice,
        status: 'active',
        authorId: user.id,
        authorName: user.name,
        updatedAt: new Date().toISOString()
      };
      if (editingAuctionId) {
        await updateDoc(doc(db, "auctions", editingAuctionId), auctionData);
        onNotify('success', `Đã cập nhật phiên đấu giá "${auctionForm.title}"!`, 'Admin');
      } else {
        await addDoc(collection(db, "auctions"), { ...auctionData, createdAt: new Date().toISOString() });
        onNotify('success', `Đã mở phiên đấu giá mới cho "${auctionForm.title}"!`, 'Admin');
      }
      setIsAuctionModalOpen(false);
    } catch (err) { onNotify('error', "Lỗi: " + String(err)); }
  };

  const handleDeleteAuction = async (a: AuctionItem) => {
    if (window.confirm(`Bạn có chắc muốn xóa vĩnh viễn phiên đấu giá "${a.title}"?`)) {
      try {
        await deleteDoc(doc(db, "auctions", a.id));
        onNotify('info', `Đã xóa phiên đấu giá ${a.title}`);
      } catch (err) { onNotify('error', "Lỗi xóa: " + err); }
    }
  };

  const handleUpdateItems = async () => {
    if (!updatingItemsFor) return;
    try {
      await updateDoc(doc(db, "missions", updatingItemsFor.id), { itemsNeeded: itemUpdates });
      setUpdatingItemsFor(null);
      onNotify('success', `Đã cập nhật số lượng hiện vật tại ${updatingItemsFor.location}!`);
    } catch (err) { onNotify('error', "Lỗi: " + err); }
  };

  const handleLogDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingDonationFor) return;
    try {
      const missionRef = doc(db, "missions", loggingDonationFor.id);
      await runTransaction(db, async (transaction) => {
        const missionDoc = await transaction.get(missionRef);
        if (!missionDoc.exists()) throw "Chuyến đi không tồn tant!";
        const currentData = missionDoc.data() as CharityMission;
        const newTotal = (currentData.currentBudget ?? 0) + donationLogForm.amount;
        transaction.update(missionRef, { currentBudget: newTotal });
        const logRef = collection(db, "missions", loggingDonationFor.id, "donations");
        await addDoc(logRef, { ...donationLogForm, createdAt: new Date().toISOString() });
      });
      setLoggingDonationFor(null);
      onNotify('success', `Ghi danh thành công ${donationLogForm.amount.toLocaleString()}đ từ ${donationLogForm.donorName}`);
      setDonationLogForm({ donorName: '', amount: 0, message: '' });
    } catch (err) { onNotify('error', "Lỗi: " + err); }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen font-['Inter']">
      <div className="flex flex-col lg:flex-row justify-between items-start mb-10 gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">Admin Dashboard</h1>
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-4">Hệ thống quản lý minh bạch GIVEBACK</p>
        </div>

        <div className="flex bg-gray-900 p-1.5 rounded-[2.5rem] shadow-2xl overflow-x-auto">
          <button onClick={() => setActiveSubTab('missions')} className={`px-6 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'missions' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Vùng cứu trợ</button>
          <button onClick={() => setActiveSubTab('auctions')} className={`px-6 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'auctions' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Đấu giá</button>
          <button onClick={() => setActiveSubTab('posts')} className={`px-6 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'posts' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Kiểm duyệt bài</button>
        </div>
      </div>

      {activeSubTab === 'missions' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-emerald-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-3xl font-black italic uppercase mb-2">Quản lý Chuyến cứu trợ</h2>
              <p className="text-emerald-300 font-bold text-sm italic">Thiết lập mục tiêu và theo dõi đóng góp minh bạch.</p>
            </div>
            <button onClick={handleOpenCreateMission} className="relative z-10 bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">Tạo chuyến đi mới</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {missions.map(m => {
              const currentBudget = m.currentBudget ?? 0;
              const targetBudget = m.targetBudget ?? 1;
              const progress = Math.min(100, Math.round((currentBudget / targetBudget) * 100));
              return (
                <div key={m.id} className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 flex flex-col gap-6 relative group hover:shadow-xl transition-all">
                  <button onClick={() => handleOpenEditMission(m)} className="absolute top-8 right-8 bg-gray-100 p-3 rounded-2xl text-gray-400 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                  <div className="flex gap-6">
                    <img src={m.image || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=200'} className="w-28 h-28 rounded-3xl object-cover shadow-lg" alt="" />
                    <div className="flex-1 pr-12">
                      <h4 className="text-2xl font-black italic uppercase text-emerald-900 leading-tight">{m.location}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">{new Date(m.date).toLocaleDateString('vi-VN')}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 p-3 rounded-2xl"><p className="text-[8px] font-black text-emerald-600 uppercase">Ngân sách</p><p className="text-sm font-black text-emerald-900">{currentBudget.toLocaleString()}đ</p></div>
                        <div className="bg-gray-50 p-3 rounded-2xl"><p className="text-[8px] font-black text-gray-400 uppercase">Hiện vật</p><p className="text-sm font-black text-gray-700">{m.itemsNeeded?.reduce((acc, curr) => acc + curr.current, 0) || 0} món</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div></div>
                  <div className="flex gap-2">
                    <button onClick={() => setLoggingDonationFor(m)} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100">Ghi danh Tiền</button>
                    <button onClick={() => { setUpdatingItemsFor(m); setItemUpdates([...(m.itemsNeeded || [])]); }} className="flex-1 bg-white text-emerald-600 border-2 border-emerald-100 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-50">Cập nhật Hiện vật</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubTab === 'auctions' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-amber-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-20 -mb-20 blur-3xl"></div>
            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-3xl font-black italic uppercase mb-2">Sàn Đấu giá Nhân văn</h2>
              <p className="text-amber-300 font-bold text-sm italic">Quản lý vật phẩm đấu giá để gây quỹ vận chuyển và nhu yếu phẩm.</p>
            </div>
            <button onClick={handleOpenCreateAuction} className="relative z-10 bg-white text-amber-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">Đăng phiên đấu giá</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {auctions.map(a => (
              <div key={a.id} className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 flex flex-col gap-6 relative group hover:shadow-xl transition-all">
                 <div className="absolute top-8 right-8 flex gap-2">
                    <button onClick={() => handleOpenEditAuction(a)} className="bg-gray-100 p-3 rounded-2xl text-gray-400 hover:bg-amber-600 hover:text-white transition-all shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                    <button onClick={() => handleDeleteAuction(a)} className="bg-red-50 p-3 rounded-2xl text-red-300 hover:bg-red-600 hover:text-white transition-all shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                 </div>
                 <div className="flex gap-6">
                    <img src={a.image} className="w-32 h-32 rounded-3xl object-cover shadow-lg" alt="" />
                    <div className="flex-1 pr-24">
                       <h4 className="text-2xl font-black italic uppercase text-amber-950 leading-tight">{a.title}</h4>
                       <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1 mb-4">Kết thúc: {new Date(a.endTime).toLocaleString('vi-VN')}</p>
                       <div className="flex flex-wrap gap-3">
                          <div className="bg-amber-50 px-4 py-2 rounded-xl text-[9px] font-black text-amber-700 uppercase">Tặng bởi: {a.donorName}</div>
                          <div className="bg-gray-50 px-4 py-2 rounded-xl text-[9px] font-black text-gray-500 uppercase">Góp quỹ: {a.missionLocation}</div>
                       </div>
                    </div>
                 </div>
                 <div className="bg-gray-50 p-6 rounded-[2.5rem] flex items-center justify-between shadow-inner">
                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Giá hiện tại</p>
                       <p className="text-3xl font-black text-amber-900 tracking-tighter">{a.currentBid.toLocaleString()} VNĐ</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Người dẫn đầu</p>
                       <p className="text-sm font-black text-gray-700 italic">{a.highestBidderName || "Chưa có"}</p>
                    </div>
                 </div>
              </div>
            ))}
            {auctions.length === 0 && <div className="lg:col-span-2 text-center py-20 italic text-gray-300 font-bold uppercase tracking-widest">Chưa có phiên đấu giá nào</div>}
          </div>
        </div>
      )}

      {activeSubTab === 'posts' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-blue-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-3xl font-black italic uppercase mb-2">Kiểm duyệt Nội dung</h2>
              <p className="text-blue-200 font-bold text-sm italic">Quản lý các bài đăng từ cộng đồng để đảm bảo văn minh.</p>
            </div>
            <div className="relative z-10 flex bg-white/10 p-1 rounded-2xl backdrop-blur-md">
               <button onClick={() => setPostFilter('market')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${postFilter === 'market' ? 'bg-white text-blue-900' : 'text-white/60'}`}>Món đồ tặng</button>
               <button onClick={() => setPostFilter('social')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${postFilter === 'social' ? 'bg-white text-blue-900' : 'text-white/60'}`}>Bảng tin</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {postFilter === 'market' ? userItems.map(item => (
              <div key={item.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 flex gap-6 group hover:shadow-xl transition-all">
                <img src={item.image} className="w-24 h-24 rounded-2xl object-cover shadow-md" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-black text-sm uppercase italic text-gray-900 truncate">{item.title}</h4>
                    <button onClick={() => handleDeleteUserItem(item.id, item.title)} className="text-red-400 hover:text-red-600 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                  </div>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-2">{item.author} &bull; {item.category}</p>
                  <p className="text-[10px] text-gray-400 italic line-clamp-2">"{item.description}"</p>
                </div>
              </div>
            )) : socialPosts.map(post => (
              <div key={post.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 flex gap-6 group hover:shadow-xl transition-all">
                <div className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                   {post.mediaUrl ? <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-[8px] font-black uppercase text-gray-400">Không ảnh</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-black text-[10px] uppercase text-blue-600 tracking-widest">{post.authorName}</p>
                    <button onClick={() => handleDeleteSocialPost(post.id)} className="text-red-400 hover:text-red-600 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                  </div>
                  <p className="text-[11px] font-medium text-gray-700 italic line-clamp-2 mt-2 leading-relaxed">"{post.content}"</p>
                  <p className="text-[8px] text-gray-400 font-bold mt-2 uppercase">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Modals --- */}
      {isMissionModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 overflow-y-auto py-10">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMissionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in-95">
             <h3 className="text-xl font-black uppercase italic text-emerald-900 mb-8">{editingMissionId ? 'Sửa chuyến cứu trợ' : 'Tạo chuyến cứu trợ mới'}</h3>
             <form onSubmit={handleSaveMission} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" placeholder="Địa điểm (Vd: Bình Định)" value={missionForm.location} onChange={e => setMissionForm({...missionForm, location: e.target.value})} />
                  <input required type="date" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" value={missionForm.date} onChange={e => setMissionForm({...missionForm, date: e.target.value})} />
                </div>

                <div className="bg-emerald-50/50 p-6 rounded-[2.5rem] border-2 border-dashed border-emerald-100">
                   <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Nhu yếu phẩm cần thiết</h4>
                      <button type="button" onClick={() => setNeededItems([...neededItems, { name: '', target: 0, current: 0, unit: '' }])} className="bg-emerald-600 text-white p-2 rounded-full shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></button>
                   </div>
                   <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                      {neededItems.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                           <input className="flex-1 bg-white p-3 rounded-xl text-xs font-bold outline-none shadow-sm" placeholder="Tên đồ" value={item.name} onChange={e => { const ni = [...neededItems]; ni[idx].name = e.target.value; setNeededItems(ni); }} />
                           <input type="number" className="w-20 bg-white p-3 rounded-xl text-xs font-bold outline-none text-center shadow-sm" placeholder="SL" value={item.target || ''} onChange={e => { const ni = [...neededItems]; ni[idx].target = parseInt(e.target.value) || 0; setNeededItems(ni); }} />
                           <input className="w-16 bg-white p-3 rounded-xl text-xs font-bold outline-none text-center shadow-sm" placeholder="Đv" value={item.unit} onChange={e => { const ni = [...neededItems]; ni[idx].unit = e.target.value; setNeededItems(ni); }} />
                           <button type="button" onClick={() => setNeededItems(neededItems.filter((_, i) => i !== idx))} className="text-red-400 p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Hộ dân mục tiêu" value={missionForm.targetHouseholds || ''} onChange={e => setMissionForm({...missionForm, targetHouseholds: parseInt(e.target.value)})} />
                  <input type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Quỹ mục tiêu (VNĐ)" value={missionForm.targetBudget || ''} onChange={e => setMissionForm({...missionForm, targetBudget: parseInt(e.target.value)})} />
                </div>
                <textarea rows={3} className="w-full bg-gray-50 p-4 rounded-2xl font-medium outline-none" placeholder="Mô tả hoàn cảnh..." value={missionForm.description} onChange={e => setMissionForm({...missionForm, description: e.target.value})} />
                
                {/* Upload Ảnh Chuyến Đi */}
                <div 
                   onClick={() => missionImageRef.current?.click()}
                   className="w-full aspect-video rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 transition-all overflow-hidden relative group"
                >
                   {missionForm.image ? (
                     <>
                       <img src={missionForm.image} className="w-full h-full object-cover" alt="Mission Preview" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <p className="text-white font-black text-[10px] uppercase tracking-widest bg-emerald-600 px-4 py-2 rounded-xl">Đổi ảnh khác</p>
                       </div>
                     </>
                   ) : (
                     <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tải lên ảnh Chuyến đi</p>
                     </div>
                   )}
                   <input ref={missionImageRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'mission')} />
                </div>

                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsMissionModalOpen(false)} className="flex-1 py-5 text-gray-400 font-black uppercase text-[10px]">Hủy</button>
                  <button type="submit" className="flex-[2] bg-emerald-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Lưu chuyến đi</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {isAuctionModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 overflow-y-auto py-10">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAuctionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in-95">
             <h3 className="text-xl font-black uppercase italic text-amber-900 mb-8">{editingAuctionId ? 'Sửa đấu giá' : 'Đăng đấu giá mới'}</h3>
             <form onSubmit={handleSaveAuction} className="space-y-6">
                <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-amber-500" placeholder="Tên vật phẩm (Vd: Đồng hồ Seiko cổ)" value={auctionForm.title} onChange={e => setAuctionForm({...auctionForm, title: e.target.value})} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase ml-2 mb-1">Giá khởi điểm (VNĐ)</label>
                    <input required type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-amber-500" placeholder="Vd: 500000" value={auctionForm.startingPrice || ''} onChange={e => setAuctionForm({...auctionForm, startingPrice: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase ml-2 mb-1">Ngày giờ kết thúc</label>
                    <input required type="datetime-local" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-amber-500" value={auctionForm.endTime} onChange={e => setAuctionForm({...auctionForm, endTime: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Nhà hảo tâm tặng đồ" value={auctionForm.donorName} onChange={e => setAuctionForm({...auctionForm, donorName: e.target.value})} />
                  <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Vùng cứu trợ thụ hưởng" value={auctionForm.missionLocation} onChange={e => setAuctionForm({...auctionForm, missionLocation: e.target.value})} />
                </div>
                <textarea rows={3} className="w-full bg-gray-50 p-4 rounded-2xl font-medium outline-none" placeholder="Mô tả giá trị vật phẩm..." value={auctionForm.description} onChange={e => setAuctionForm({...auctionForm, description: e.target.value})} />
                
                {/* Upload Ảnh Đấu Giá */}
                <div 
                   onClick={() => auctionImageRef.current?.click()}
                   className="w-full aspect-video rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50/30 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 transition-all overflow-hidden relative group"
                >
                   {auctionForm.image ? (
                     <>
                       <img src={auctionForm.image} className="w-full h-full object-cover" alt="Auction Preview" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <p className="text-white font-black text-[10px] uppercase tracking-widest bg-amber-600 px-4 py-2 rounded-xl">Đổi ảnh khác</p>
                       </div>
                     </>
                   ) : (
                     <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Tải lên ảnh vật phẩm</p>
                     </div>
                   )}
                   <input ref={auctionImageRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'auction')} />
                </div>

                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsAuctionModalOpen(false)} className="flex-1 py-5 text-gray-400 font-black uppercase text-[10px]">Hủy</button>
                  <button type="submit" className="flex-[2] bg-amber-800 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Lên sàn ngay</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {updatingItemsFor && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUpdatingItemsFor(null)}></div>
           <div className="relative bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl p-10">
              <h2 className="text-2xl font-black uppercase italic text-emerald-900 mb-6">Cập nhật hiện vật</h2>
              <div className="space-y-4 max-h-[50vh] overflow-y-auto mb-8 pr-2">
                 {itemUpdates.map((item, idx) => (
                   <div key={idx} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
                      <div className="flex-1">
                         <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{item.name} (MT: {item.target} {item.unit})</p>
                         <input type="number" className="w-full bg-white px-4 py-2 rounded-xl font-bold outline-none border-2 border-emerald-100 focus:border-emerald-500" value={item.current} onChange={(e) => { const nu = [...itemUpdates]; nu[idx].current = parseInt(e.target.value) || 0; setItemUpdates(nu); }} />
                      </div>
                   </div>
                 ))}
              </div>
              <button onClick={handleUpdateItems} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Xác nhận cập nhật</button>
           </div>
        </div>
      )}

      {loggingDonationFor && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLoggingDonationFor(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10">
             <h2 className="text-2xl font-black uppercase italic text-emerald-900 mb-6">Ghi danh quyên góp</h2>
             <form onSubmit={handleLogDonation} className="space-y-6">
                <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none shadow-sm" placeholder="Tên nhà hảo tâm" value={donationLogForm.donorName} onChange={e => setLoggingDonationFor && setDonationLogForm({...donationLogForm, donorName: e.target.value})} />
                <input required type="number" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none shadow-sm" placeholder="Số tiền (VNĐ)" value={donationLogForm.amount || ''} onChange={e => setDonationLogForm({...donationLogForm, amount: parseInt(e.target.value)})} />
                <textarea className="w-full bg-gray-50 p-4 rounded-2xl font-medium outline-none shadow-sm" rows={2} placeholder="Lời nhắn" value={donationLogForm.message} onChange={e => setDonationLogForm({...donationLogForm, message: e.target.value})} />
                <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Hoàn tất ghi danh</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
