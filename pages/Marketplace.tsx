
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

// Hàm nén ảnh để tránh lỗi 1MB của Firestore
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
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
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
  const [currentMimeType, setCurrentMimeType] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [newPost, setNewPost] = useState({
    title: '', category: CATEGORIES[0], condition: 'good' as 'new' | 'good' | 'used', description: '', location: '', contact: '', quantity: 1
  });

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
    
    const q = query(collection(db, "items"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationItem));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(data);
    });
    return () => unsubscribe();
  }, [isModalOpen]);

  const handleActivateAI = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
      onNotify('success', "AI Vision đã nhận diện 'chìa khóa'. Đệ hãy thử chọn lại ảnh để AI phân tích nhé!", "GIVEBACK AI");
    }
  };

  const runAIAnalysis = async (base64: string, mime: string) => {
    if (!base64 || loadingAI) return;
    setLoadingAI(true);
    try {
      const result = await analyzeItemImage(base64, mime);
      if (result) {
        setNewPost(prev => ({
          ...prev,
          title: result.title || prev.title,
          category: CATEGORIES.includes(result.category) ? result.category : prev.category,
          condition: (result.condition === 'new' || result.condition === 'good' || result.condition === 'used') ? result.condition : prev.condition,
          description: result.description || prev.description
        }));
        onNotify('success', "AI đã 'nhìn' ra món đồ và điền thông tin giúp đệ rồi!", "GIVEBACK AI");
      }
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      onNotify('error', "AI đang bận hoặc Key chưa đúng Project, đệ thử lại sau nhé!");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      setMediaType(isVideo ? 'video' : 'image');
      setCurrentMimeType(isVideo ? file.type : 'image/jpeg');
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        let base64 = reader.result as string;
        if (!isVideo) base64 = await compressImage(base64);
        setPreviewMedia(base64);
        if (!isVideo) runAIAnalysis(base64, 'image/jpeg');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || loadingAI) return;
    setIsSubmitting(true);
    try {
      const itemData = {
        ...newPost,
        image: mediaType === 'image' && previewMedia ? previewMedia : `https://picsum.photos/seed/${Date.now()}/400/300`,
        video: mediaType === 'video' ? previewMedia : null,
        author: user.name, authorId: user.id, createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "items"), itemData);
      setIsModalOpen(false);
      onNotify('success', `Đã đăng bài tặng món đồ "${newPost.title}" thành công!`, 'GIVEBACK');
      setNewPost({ title: '', category: CATEGORIES[0], condition: 'good', description: '', location: '', contact: '', quantity: 1 });
      setPreviewMedia(null);
    } catch (err: any) { 
      onNotify('error', "Lỗi đăng bài: " + (err.message || String(err))); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleContactDonor = async (item: DonationItem) => {
    if (item.authorId === user.id) {
      onNotify('warning', "Món đồ này của chính đệ mà, nhắn tin cho mình làm chi?", "Hệ thống");
      return;
    }

    setIsConnectingChat(true);
    try {
      const q = query(
        collection(db, "chats"), 
        where("itemId", "==", item.id),
        where("receiverId", "==", user.id)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setActiveTab('messages');
      } else {
        const chatId = `${item.id}_${user.id}`;
        const newChat: ChatSession = {
          id: chatId,
          itemId: item.id,
          itemTitle: item.title,
          donorId: item.authorId,
          donorName: item.author,
          receiverId: user.id,
          receiverName: user.name,
          participants: [item.authorId, user.id],
          readBy: [user.id], // Người khởi tạo đã đọc
          lastMessage: `Chào ${item.author}, mình muốn nhận món đồ "${item.title}" này ạ!`,
          lastSenderId: user.id,
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, "chats", chatId), newChat);
        
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: user.id,
          senderName: user.name,
          text: newChat.lastMessage,
          createdAt: new Date().toISOString()
        });

        onNotify('success', `Đã kết nối với ${item.author}!`, "GIVEBACK");
        setActiveTab('messages');
      }
    } catch (err) {
      console.error("Lỗi kết nối chat:", err);
      onNotify('error', "Không thể kết nối lúc này, đệ thử lại sau nhé!");
    } finally {
      setIsConnectingChat(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tất cả' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="mb-10 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div>
               <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Đấu giá Gây quỹ</h2>
               <p className="text-amber-200 font-bold text-sm italic">Cùng GIVEBACK lan tỏa yêu thương qua các vật phẩm giá trị.</p>
            </div>
            <button onClick={() => setActiveTab('contact')} className="bg-amber-500 text-amber-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">Liên hệ Admin</button>
         </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-4xl font-black text-emerald-900 italic uppercase tracking-tighter">Cửa hàng Tặng đồ</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Đăng món đồ tặng</button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-50 mb-10 flex flex-col md:flex-row gap-4">
        <input type="text" placeholder="Tìm kiếm..." className="flex-1 bg-gray-50 px-6 py-4 rounded-full text-sm font-bold outline-none border-2 border-transparent focus:border-emerald-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 md:p-10 animate-in zoom-in-95 duration-200">
             
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase italic text-emerald-900">Chi tiết món đồ tặng</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleActivateAI}
                    disabled={loadingAI}
                    className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                      !hasKey 
                      ? 'bg-red-600 text-white animate-bounce' 
                      : loadingAI 
                        ? 'bg-amber-100 text-amber-700 animate-pulse' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {!hasKey ? 'KÍCH HOẠT AI VISION' : loadingAI ? 'AI ĐANG PHÂN TÍCH...' : 'AI SẴN SÀNG (ĐỔI KEY)'}
                  </button>
                  
                  <button type="button" onClick={() => setShowGuide(!showGuide)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-emerald-100 hover:text-emerald-600 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                </div>
             </div>

             {showGuide && (
               <div className="mb-8 bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 animate-in slide-in-from-top-4">
                  <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-3">Hướng dẫn cho Đệ:</h4>
                  <ol className="text-[9px] space-y-2 text-emerald-700 font-bold list-decimal ml-4">
                    <li>Nhấn nút <b>"KÍCH HOẠT AI VISION"</b> và chọn Project đệ vừa tạo Key.</li>
                    <li>Bấm vào khung ảnh bên dưới để chọn hình món đồ.</li>
                    <li>AI sẽ tự động điền Tên, Danh mục, Mô tả giúp đệ.</li>
                  </ol>
               </div>
             )}

             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-1/2 flex flex-col gap-2">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square bg-gray-50 border-2 border-dashed border-emerald-100 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 transition-all overflow-hidden relative group"
                    >
                      {previewMedia ? (
                        <>
                          <img src={previewMedia} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <p className="bg-white text-emerald-900 px-4 py-2 rounded-xl text-[8px] font-black uppercase">Đổi ảnh khác</p>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Chọn ảnh món đồ</p>
                        </div>
                      )}
                      {loadingAI && <div className="absolute inset-0 bg-emerald-900/20 backdrop-blur-[2px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                     <input required className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" placeholder="Tên món đồ..." value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                     <select className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none cursor-pointer" value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})}>
                       {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <select className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none cursor-pointer" value={newPost.condition} onChange={e => setNewPost({...newPost, condition: e.target.value as any})}>
                       <option value="new">Mới 100%</option>
                       <option value="good">Còn tốt</option>
                       <option value="used">Đã sử dụng</option>
                     </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="Địa chỉ nhận đồ" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={newPost.location} onChange={e => setNewPost({...newPost, location: e.target.value})} />
                  <input required placeholder="SĐT liên hệ" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={newPost.contact} onChange={e => setNewPost({...newPost, contact: e.target.value})} />
                </div>

                <div className="relative">
                  <textarea rows={3} placeholder="Mô tả chi tiết..." className="w-full p-6 bg-gray-50 rounded-[2rem] font-medium outline-none italic text-gray-600" value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} />
                  {previewMedia && !loadingAI && hasKey && (
                    <button type="button" onClick={() => runAIAnalysis(previewMedia, currentMimeType)} className="absolute right-6 top-4 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[8px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                      Nhờ AI phân tích lại
                    </button>
                  )}
                </div>

                <button type="submit" disabled={isSubmitting || loadingAI} className="w-full bg-emerald-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50">
                   {isSubmitting ? 'ĐANG ĐĂNG BÀI...' : 'ĐĂNG MÓN ĐỒ NGAY'}
                </button>
             </form>
             <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>
      )}

      {/* Modal Chi tiết */}
      {selectedItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
           <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md" onClick={() => setSelectedItem(null)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
              <img src={selectedItem.image} className="w-full h-64 object-cover" alt="" />
              <div className="p-8">
                 <h3 className="text-2xl font-black italic uppercase text-emerald-900 mb-2">{selectedItem.title}</h3>
                 <p className="text-emerald-600 font-bold text-xs uppercase mb-4 tracking-widest">{selectedItem.category} &bull; {selectedItem.location}</p>
                 <p className="text-gray-600 leading-relaxed mb-8 italic">"{selectedItem.description}"</p>
                 <button 
                  onClick={() => handleContactDonor(selectedItem)} 
                  disabled={isConnectingChat}
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95 transition-all disabled:opacity-50"
                 >
                   {isConnectingChat ? 'ĐANG KẾT NỐI...' : 'Nhắn tin nhận đồ ngay'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
