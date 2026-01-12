
import React, { useState, useEffect, useRef } from 'react';
import ItemCard from '../components/ItemCard';
import { CATEGORIES } from '../constants';
import { DonationItem, User, ChatSession } from '../types';
import { analyzeItemImage } from '../services/geminiService';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  setDoc,
  doc
} from "firebase/firestore";
import { db } from '../services/firebase';

interface MarketplaceProps {
  user: User;
  setActiveTab: (tab: 'home' | 'market' | 'auction' | 'admin' | 'messages' | 'profile' | 'map' | 'contact') => void;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
}

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800; 
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

const Marketplace: React.FC<MarketplaceProps> = ({ user, setActiveTab, onNotify }) => {
  const [items, setItems] = useState<DonationItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [loadingAI, setLoadingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectingChat, setIsConnectingChat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [hasKey, setHasKey] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '', category: CATEGORIES[0], condition: 'good' as 'new' | 'good' | 'used', description: '', location: '', contact: '', quantity: 1
  });

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
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      setMediaType(isVideo ? 'video' : 'image');
      const reader = new FileReader();
      reader.onloadend = async () => {
        let base64 = reader.result as string;
        if (!isVideo) base64 = await compressImage(base64);
        setPreviewMedia(base64);
        if (!isVideo && hasKey) {
          setLoadingAI(true);
          const result = await analyzeItemImage(base64, 'image/jpeg');
          if (result) {
            setNewPost(prev => ({ ...prev, title: result.title, category: result.category, description: result.description, condition: result.condition }));
          }
          setLoadingAI(false);
        }
      };
      reader.readAsDataURL(file);
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
      // Đảm bảo quantity luôn là 1 khi mới đăng
      itemData.quantity = 1; 

      await addDoc(collection(db, "items"), itemData);
      setIsModalOpen(false);
      onNotify('success', `Đã đăng món đồ "${newPost.title}"!`, 'GIVEBACK');
      setNewPost({ title: '', category: CATEGORIES[0], condition: 'good', description: '', location: '', contact: '', quantity: 1 });
      setPreviewMedia(null);
    } catch (err) { 
      console.error("Lỗi đăng bài:", err);
      onNotify('error', "Có lỗi xảy ra khi đăng bài."); 
    } finally { setIsSubmitting(false); }
  };

  // PHÒNG NGỪA LỖI: Chỉ tạo hội thoại, tuyệt đối không cập nhật món đồ tại đây
  const handleContactDonor = async (item: DonationItem) => {
    if (!item.id || !user.id) return;
    
    if (item.authorId === user.id) {
      onNotify('warning', "Món đồ này của đệ mà!", "Hệ thống");
      return;
    }

    if (item.quantity <= 0) {
      onNotify('error', "Rất tiếc, món đồ này đã được tặng cho người khác rồi!", "Hệ thống");
      setSelectedItem(null);
      return;
    }

    setIsConnectingChat(true);
    console.log(`[LOG] Bắt đầu kết nối nhận đồ cho item: ${item.id} từ user: ${user.id}`);

    try {
      // Tìm hội thoại hiện có dựa trên itemId và receiverId
      const q = query(
        collection(db, "chats"), 
        where("itemId", "==", item.id),
        where("receiverId", "==", user.id)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log("[LOG] Đã có hội thoại trước đó, chuyển hướng...");
        setActiveTab('messages');
      } else {
        const chatId = `${item.id}_${user.id}_${Date.now()}`;
        const initialText = `Chào ${item.author}, đệ rất thích món đồ "${item.title}" này, không biết đệ có thể xin nhận nó được không ạ?`;
        
        const newChat: ChatSession = {
          id: chatId,
          itemId: item.id,
          itemTitle: item.title,
          donorId: item.authorId,
          donorName: item.author,
          receiverId: user.id,
          receiverName: user.name,
          participants: [item.authorId, user.id],
          readBy: [user.id],
          lastMessage: initialText,
          lastSenderId: user.id,
          updatedAt: new Date().toISOString()
        };

        // Ghi dữ liệu vào Firestore - CHỈ tác động lên collection 'chats' và 'messages'
        await setDoc(doc(db, "chats", chatId), newChat);
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: user.id,
          senderName: user.name,
          text: initialText,
          createdAt: new Date().toISOString()
        });

        console.log("[LOG] Đã tạo thành công hội thoại mới.");
        onNotify('success', `Đã gửi lời nhắn đến ${item.author}!`, "GIVEBACK");
        setActiveTab('messages');
      }
    } catch (err) {
      console.error("[CRITICAL] Lỗi tạo hội thoại:", err);
      onNotify('error', "Không thể kết nối hội thoại lúc này.");
    } finally { 
      setIsConnectingChat(false); 
      setSelectedItem(null); // Đóng modal chi tiết
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tất cả' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
           <h1 className="text-4xl font-black text-emerald-900 italic uppercase tracking-tighter">Cửa hàng Tặng đồ</h1>
           <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Nơi những món đồ tìm thấy chủ nhân mới</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Đăng món đồ tặng</button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-50 mb-10 flex flex-col md:flex-row gap-4">
        <input type="text" placeholder="Tìm kiếm món đồ đệ cần..." className="flex-1 bg-gray-50 px-6 py-4 rounded-full text-sm font-bold outline-none border-2 border-transparent focus:border-emerald-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
          {['Tất cả', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-lg' : 'bg-emerald-50 text-emerald-600'}`}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map(item => (
          <ItemCard key={item.id} item={item} user={user} onSelect={(item) => setSelectedItem(item)} onNotify={onNotify} />
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 overflow-y-auto py-10">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 md:p-10 animate-in zoom-in-95">
             <h2 className="text-2xl font-black uppercase italic text-emerald-900 mb-8">Thông tin món đồ tặng</h2>
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                   <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full md:w-1/2 aspect-square bg-gray-50 border-2 border-dashed border-emerald-100 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 overflow-hidden relative"
                    >
                      {previewMedia ? (
                        <img src={previewMedia} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="text-center p-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p className="text-[10px] font-black text-emerald-900 uppercase">Chọn ảnh món đồ</p>
                        </div>
                      )}
                      {loadingAI && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>}
                   </div>
                   <div className="flex-1 space-y-4">
                     <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="Tên món đồ..." value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                     <select className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})}>
                       {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <select className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={newPost.condition} onChange={e => setNewPost({...newPost, condition: e.target.value as any})}>
                       <option value="new">Mới 100%</option>
                       <option value="good">Còn tốt</option>
                       <option value="used">Đã sử dụng</option>
                     </select>
                     <input required placeholder="SĐT liên hệ" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={newPost.contact} onChange={e => setNewPost({...newPost, contact: e.target.value})} />
                   </div>
                </div>
                <input required placeholder="Địa chỉ nhận đồ" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={newPost.location} onChange={e => setNewPost({...newPost, location: e.target.value})} />
                <textarea rows={3} placeholder="Mô tả chân thành về món đồ..." className="w-full p-6 bg-gray-50 rounded-[2rem] font-medium outline-none italic" value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} />
                <button type="submit" disabled={isSubmitting || loadingAI} className="w-full bg-emerald-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all">
                   {isSubmitting ? 'ĐANG LÊN SÓNG...' : 'ĐĂNG MÓN ĐỒ NGAY'}
                </button>
             </form>
             <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
           <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md" onClick={() => setSelectedItem(null)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
              <img src={selectedItem.image} className="w-full h-64 object-cover" alt="" />
              <div className="p-8 text-center">
                 <h3 className="text-2xl font-black italic uppercase text-emerald-900 mb-2">{selectedItem.title}</h3>
                 <p className="text-emerald-600 font-bold text-[10px] uppercase mb-4 tracking-widest">{selectedItem.category} &bull; {selectedItem.location}</p>
                 <p className="text-gray-600 italic mb-8">"{selectedItem.description}"</p>
                 <button 
                  onClick={() => handleContactDonor(selectedItem)} 
                  disabled={isConnectingChat || selectedItem.quantity <= 0}
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                 >
                   {selectedItem.quantity <= 0 ? 'ĐÃ HẾT HÀNG' : (isConnectingChat ? 'ĐANG KẾT NỐI...' : 'Nhắn tin nhận đồ ngay')}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
