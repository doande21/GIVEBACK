
import React, { useState, useEffect, useRef } from 'react';
import ItemCard from '../components/ItemCard';
import { CATEGORIES } from '../constants';
import { DonationItem, User, PostMedia } from '../types';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from '../services/firebase';

const compressImage = (base64Str: string, maxWidth = 1000, quality = 0.7): Promise<string> => {
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

const MediaGrid: React.FC<{ mediaList: PostMedia[] }> = ({ mediaList }) => {
  if (mediaList.length === 0) return null;
  const count = mediaList.length;
  return (
    <div className={`grid gap-1 w-full h-full ${count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
      {mediaList.slice(0, 4).map((m, i) => (
        <div key={i} className={`relative overflow-hidden bg-gray-100 ${count === 3 && i === 0 ? 'row-span-2' : ''}`}>
          {m.type === 'video' ? <video src={m.url} className="w-full h-full object-cover" /> : <img src={m.url} className="w-full h-full object-cover" alt="" />}
          {i === 3 && count > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-black text-lg">+{count - 4}</span></div>}
        </div>
      ))}
    </div>
  );
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMedia, setSelectedMedia] = useState<PostMedia[]>([]);

  useEffect(() => {
    const q = query(collection(db, "items"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationItem));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(data);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setIsCompressing(true);
    const newMedia: PostMedia[] = [];
    for (const file of files) {
      const reader = new FileReader();
      const promise = new Promise<PostMedia>((resolve) => {
        reader.onloadend = async () => {
          let url = reader.result as string;
          let type: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
          if (type === 'image') url = await compressImage(url);
          resolve({ url, type });
        };
      });
      reader.readAsDataURL(file);
      const res = await promise; if (res) newMedia.push(res);
    }
    setSelectedMedia(prev => [...prev, ...newMedia]);
    setIsCompressing(false);
  };

  const [newPost, setNewPost] = useState({
    title: '', category: CATEGORIES[0], condition: 'good' as 'new' | 'good' | 'used', description: '', location: '', contact: '', quantity: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isCompressing || selectedMedia.length === 0) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "items"), {
        ...newPost, quantity: Number(newPost.quantity), 
        image: selectedMedia[0].url, gallery: selectedMedia,
        author: user.name, authorId: user.id, createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      onNotify('success', `Đã lan tỏa món quà "${newPost.title}"!`);
      setNewPost({ title: '', category: CATEGORIES[0], condition: 'good', description: '', location: '', contact: '', quantity: 1 });
      setSelectedMedia([]);
    } catch (err) { onNotify('error', "Lỗi đăng bài."); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto font-['Inter']">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-emerald-950 italic uppercase tracking-tighter leading-none">Sàn Tặng đồ</h1>
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-4 italic">Sẻ chia hiện vật, lan tỏa nụ cười</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">Đăng đồ tặng mới</button>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-emerald-50 mb-12 flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Tìm món đồ đệ cần..." className="w-full pl-14 pr-6 py-4 bg-gray-50 rounded-full text-xs font-black italic outline-none border-2 border-transparent focus:border-emerald-500 transition-all uppercase tracking-tight" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide py-1">
          {['Tất cả', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-xl' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {items.filter(item => (selectedCategory === 'Tất cả' || item.category === selectedCategory) && item.title.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
          <ItemCard key={item.id} item={item} user={user} onSelect={(item) => setSelectedItem(item)} onNotify={onNotify} />
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-10 overflow-y-auto">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl p-8 md:p-12 animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black uppercase italic text-emerald-950 tracking-tighter leading-none">Món quà Đệ muốn tặng</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500 transition-all" placeholder="Tên món đồ (Vd: Gấu bông, Nồi cơm...)" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                        <select className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none cursor-pointer" value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})}>
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <select className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none cursor-pointer" value={newPost.condition} onChange={e => setNewPost({...newPost, condition: e.target.value as any})}>
                          <option value="new">Mới 100%</option><option value="good">Còn tốt</option><option value="used">Đã dùng</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input required placeholder="Đệ ở đâu? (Vd: Quận 1)" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={newPost.location} onChange={e => setNewPost({...newPost, location: e.target.value})} />
                        <div className="relative">
                          <input required type="number" min="1" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none pr-10" placeholder="Số lượng" value={newPost.quantity} onChange={e => setNewPost({...newPost, quantity: parseInt(e.target.value) || 1})} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-gray-300 uppercase">Cái</span>
                        </div>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div onClick={() => fileInputRef.current?.click()} className="h-full min-h-[180px] border-4 border-dashed border-emerald-50 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 transition-all relative overflow-hidden group shadow-inner">
                         {selectedMedia.length > 0 ? (
                            <MediaGrid mediaList={selectedMedia} />
                         ) : (
                           <div className="text-center px-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-200 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Tải lên ít nhất 1 ảnh</span>
                           </div>
                         )}
                         <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <span className="text-white text-[9px] font-black uppercase tracking-widest">Thay đổi media</span>
                         </div>
                      </div>
                   </div>
                </div>
                <textarea required rows={4} placeholder="Hãy viết vài dòng chân thành về món quà này để người nhận thêm ấm lòng nhé..." className="w-full bg-gray-50 p-8 rounded-[2.5rem] font-medium italic outline-none border-2 border-transparent focus:border-emerald-500 transition-all text-sm leading-relaxed" value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} />
                <button type="submit" disabled={isSubmitting || isCompressing} className="w-full bg-emerald-950 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-100 hover:scale-[1.02] active:scale-95 transition-all text-[11px] disabled:opacity-50">
                  {isSubmitting ? 'ĐANG LAN TỎA...' : isCompressing ? 'ĐANG NÉN DỮ LIỆU...' : 'ĐĂNG TIN TẶNG ĐỒ NGAY'}
                </button>
             </form>
             <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,video/*" onChange={handleFileChange} />
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-6">
           <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xl" onClick={() => setSelectedItem(null)}></div>
           <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-400">
              <div className="h-[400px] bg-gray-100 relative">
                <MediaGrid mediaList={selectedItem.gallery || [{url: selectedItem.image, type: 'image'}]} />
                <div className="absolute bottom-8 left-8 flex gap-3">
                  <div className="bg-emerald-600 text-white text-[9px] font-black px-5 py-2.5 rounded-full uppercase tracking-widest italic shadow-2xl border-2 border-white/20">
                    TÌNH TRẠNG: {selectedItem.condition === 'new' ? 'MỚI 100%' : selectedItem.condition === 'good' ? 'CÒN TỐT' : 'ĐÃ DÙNG'}
                  </div>
                  <div className="bg-amber-500 text-white text-[9px] font-black px-5 py-2.5 rounded-full uppercase tracking-widest italic shadow-2xl border-2 border-white/20">
                    HIỆN CÓ: {selectedItem.quantity} CÁI
                  </div>
                </div>
              </div>
              <div className="p-12">
                 <h3 className="text-4xl font-black italic uppercase text-emerald-950 mb-4 tracking-tighter leading-none">{selectedItem.title}</h3>
                 <div className="flex items-center gap-3 mb-8">
                    <span className="text-emerald-600 font-black text-[11px] uppercase tracking-[0.3em] bg-emerald-50 px-4 py-1.5 rounded-full italic">{selectedItem.category}</span>
                    <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">📍 {selectedItem.location}</span>
                 </div>
                 <div className="bg-emerald-50/30 p-8 rounded-[3rem] mb-10 border border-emerald-50 shadow-inner">
                    <p className="text-emerald-950 leading-relaxed italic text-base font-medium">"{selectedItem.description}"</p>
                 </div>
                 <button 
                  disabled={selectedItem.quantity <= 0}
                  onClick={() => {
                    const chatId = `chat_${selectedItem.id}_${user.id}`;
                    setDoc(doc(db, "chats", chatId), {
                      id: chatId, type: 'direct', itemId: selectedItem.id, itemTitle: selectedItem.title, itemImage: selectedItem.image,
                      donorId: selectedItem.authorId, donorName: selectedItem.author, receiverId: user.id, receiverName: user.name,
                      participants: [selectedItem.authorId, user.id], lastMessage: "Chào đệ, mình muốn nhận món đồ này...", lastSenderId: user.id,
                      updatedAt: new Date().toISOString(), giftStatus: 'negotiating'
                    }).then(() => {
                      if (setActiveTab) setActiveTab('messages');
                      setSelectedItem(null);
                    });
                  }}
                  className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 text-[11px] ${selectedItem.quantity > 0 ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  {selectedItem.quantity > 0 ? "BẮT ĐẦU TRÒ CHUYỆN XIN ĐỒ" : "MÓN QUÀ NÀY ĐÃ ĐƯỢC TRAO HẾT"}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
