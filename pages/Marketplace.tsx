
import React, { useState, useEffect, useRef } from 'react';
import ItemCard from '../components/ItemCard';
import { CATEGORIES } from '../constants';
import { DonationItem, User, ClaimRecord } from '../types';
import { suggestDescription, analyzeItemImage } from '../services/geminiService';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db } from '../services/firebase';

interface MarketplaceProps {
  user: User;
  setActiveTab?: (tab: any) => void;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ user, setActiveTab, onNotify }) => {
  const [items, setItems] = useState<DonationItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  
  const [loadingAI, setLoadingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  useEffect(() => {
    const q = query(collection(db, "items"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationItem));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(data);
    });
    return () => unsubscribe();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tất cả' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const [newPost, setNewPost] = useState({
    title: '', category: CATEGORIES[0], condition: 'good' as 'new' | 'good' | 'used', description: '', location: '', contact: '', quantity: 1
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      const reader = new FileReader();
      reader.onloadend = () => setPreviewMedia(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmClaim = async (item: DonationItem) => {
    if (item.quantity <= 0) return;
    try {
      // 1. Tạo Chat Session
      const chatId = `${item.id}_${user.id}`;
      await setDoc(doc(db, "chats", chatId), {
        id: chatId,
        itemId: item.id,
        itemTitle: item.title,
        donorId: item.authorId,
        donorName: item.author,
        receiverId: user.id,
        receiverName: user.name,
        participants: [item.authorId, user.id],
        lastMessage: "Chào bạn, mình muốn đăng ký nhận món đồ này.",
        lastSenderId: user.id,
        updatedAt: new Date().toISOString()
      });

      // 2. Ghi lại lịch sử nhận đồ (Claims)
      const claimData: Omit<ClaimRecord, 'id'> = {
        itemId: item.id,
        itemTitle: item.title,
        itemImage: item.image,
        donorId: item.authorId,
        donorName: item.author,
        receiverId: user.id,
        receiverName: user.name,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "claims"), claimData);

      // 3. Cập nhật số lượng món đồ
      await updateDoc(doc(db, "items", item.id), { quantity: item.quantity - 1 });
      
      onNotify('success', `Đã kết nối thành công với ${item.author}. Thông tin nhận đồ đã được lưu vào nhật ký của Đệ!`, 'Yêu thương');
      setSelectedItem(null);
    } catch (err) {
      onNotify('error', "Không thể thực hiện yêu cầu. Lỗi: " + String(err), 'Hệ thống');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const itemData = {
        ...newPost,
        image: mediaType === 'image' && previewMedia ? previewMedia : `https://picsum.photos/seed/${Date.now()}/400/300`,
        video: mediaType === 'video' ? previewMedia : null,
        author: user.name,
        authorId: user.id,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "items"), itemData);
      setIsModalOpen(false);
      onNotify('success', `Món đồ "${newPost.title}" đã được đăng thành công!`, 'GIVEBACK');
      setNewPost({ title: '', category: CATEGORIES[0], condition: 'good', description: '', location: '', contact: '', quantity: 1 });
      setPreviewMedia(null);
    } catch (err) { 
      onNotify('error', "Lỗi đăng bài: " + String(err), 'Hệ thống'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="mb-10 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl text-center md:text-left">
               <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mb-4">Lan tỏa giá trị cao?</h2>
               <p className="text-amber-200 font-bold text-sm md:text-base italic leading-relaxed">
                  Thay vì tặng lẻ, hãy tổ chức Đấu giá để góp quỹ vận hành GIVEBACK.
               </p>
            </div>
            <button 
               onClick={() => setActiveTab?.('contact')} 
               className="bg-amber-500 hover:bg-amber-400 text-amber-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl"
            >
               Liên hệ Admin
            </button>
         </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black text-emerald-900 italic uppercase tracking-tighter">Sàn Tặng đồ</h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Kết nối những món quà không đồng</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Đăng đồ tặng ngay</button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-50 mb-10 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Tìm món đồ..." className="w-full pl-14 pr-6 py-4 bg-gray-50 rounded-full text-sm font-bold outline-none border-2 border-transparent focus:border-emerald-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
          {['Tất cả', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-lg' : 'bg-emerald-50 text-emerald-600'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map(item => (
          <ItemCard key={item.id} item={item} user={user} onSelect={(item) => setSelectedItem(item)} onNotify={onNotify} />
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
             <h2 className="text-2xl font-black uppercase italic text-emerald-900 mb-8">Thông tin đồ tặng</h2>
             <form onSubmit={handleSubmit} className="space-y-6">
                <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Tên món đồ..." value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-4">
                      <select className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <input required placeholder="Địa điểm (Vd: Quận 1)" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={newPost.location} onChange={e => setNewPost({...newPost, location: e.target.value})} />
                   </div>
                   <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-emerald-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 transition-colors"
                   >
                      {previewMedia ? (
                        mediaType === 'video' ? <video src={previewMedia} className="w-full h-full object-cover rounded-2xl" /> : <img src={previewMedia} className="w-full h-full object-cover rounded-2xl" alt="" />
                      ) : (
                        <div className="text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p className="text-[10px] font-black text-emerald-600 uppercase mt-2">Ảnh / Video</p>
                        </div>
                      )}
                   </div>
                </div>
                <textarea required rows={3} placeholder="Đệ viết vài dòng mô tả..." className="w-full bg-gray-50 p-4 rounded-2xl font-medium outline-none" value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} />
                <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">Đăng đồ lên sàn</button>
             </form>
             <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
           <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md" onClick={() => setSelectedItem(null)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300">
              <div className="h-64 bg-gray-100">
                <img src={selectedItem.image} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="p-8">
                 <h3 className="text-2xl font-black italic uppercase text-emerald-900 mb-2">{selectedItem.title}</h3>
                 <p className="text-emerald-600 font-bold text-xs uppercase mb-4 tracking-widest">{selectedItem.category} &bull; {selectedItem.location}</p>
                 <p className="text-gray-600 leading-relaxed mb-8 italic">"{selectedItem.description}"</p>
                 <button 
                  onClick={() => handleConfirmClaim(selectedItem)}
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  Nhận món đồ này
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
