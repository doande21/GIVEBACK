
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
  getDoc
} from "firebase/firestore";
import { db } from '../services/firebase';
import { analyzeDonationItem } from '../services/geminiService';

const compressImage = (base64Str: string, maxWidth = 600, quality = 0.5): Promise<string> => {
  return new Promise<string>((resolve) => {
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

interface MarketplaceProps {
  user: User;
  onNotify: (type: string, message: string, sender?: string) => void;
  setActiveTab?: (tab: string) => void;
  onViewProfile: (userId: string) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ user, onNotify, setActiveTab, onViewProfile }) => {
  const [items, setItems] = useState<DonationItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [filterAge, setFilterAge] = useState<number | ''>('');
  const [filterWeight, setFilterWeight] = useState<number | ''>('');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterGenre, setFilterGenre] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<PostMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newPost, setNewPost] = useState<any>({
    title: '', category: CATEGORIES[0], condition: 'good', 
    description: '', location: '', quantity: 1,
    minAge: 0, maxAge: 0, minWeight: 0, maxWeight: 0,
    bookAuthor: '', bookGenre: ''
  });

  useEffect(() => {
    const q = query(collection(db, "items"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationItem));
      data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setItems(data);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsAiScanning(true);
    // Cast to File explicitly, which extends browser Blob
    const firstFile: File = files[0];
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      // FileReader result can be string or ArrayBuffer; analyzeDonationItem expects a base64 string
      const base64 = typeof reader.result === 'string' ? reader.result : '';
      if (!base64) {
        setIsAiScanning(false);
        return;
      }

      const compressed = await compressImage(base64);
      setSelectedMedia([{ url: compressed, type: 'image' }]);
      
      onNotify('info', "AI đang quét dữ liệu hình ảnh...", "GIVEBACK AI");
      const aiData = await analyzeDonationItem(compressed, newPost.description);
      if (aiData) {
        setNewPost((prev: any) => ({
          ...prev,
          title: aiData.suggestedTitle || prev.title,
          minAge: aiData.minAge || 0,
          maxAge: aiData.maxAge || 0,
          minWeight: aiData.minWeight || 0,
          maxWeight: aiData.maxWeight || 0,
          bookAuthor: aiData.bookAuthor || '',
          bookGenre: aiData.bookGenre || ''
        }));
        onNotify('success', "AI đã quét thông tin thành công!", "GIVEBACK AI");
      }
      setIsAiScanning(false);
    };
    reader.readAsDataURL(firstFile);
  };

  const handleStartChat = async (item: DonationItem) => {
    if (item.authorId === user.id) {
      onNotify('warning', "Đệ không thể tự nhắn tin cho chính mình nhé!");
      return;
    }

    const chatId = item.id < user.id ? `chat_${item.id}_${user.id}` : `chat_${user.id}_${item.id}`;
    
    try {
      const chatRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          id: chatId,
          type: 'direct',
          itemId: item.id,
          itemTitle: item.title,
          itemImage: item.image,
          donorId: item.authorId,
          donorName: item.author,
          receiverId: user.id,
          receiverName: user.name,
          participants: [item.authorId, user.id],
          lastMessage: `Chào đệ, mình muốn hỏi về món đồ "${item.title}"...`,
          lastSenderId: user.id,
          updatedAt: new Date().toISOString(),
          giftStatus: 'negotiating'
        });

        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: user.id,
          senderName: user.name,
          text: `Chào bạn, mình thấy bạn đang tặng "${item.title}", mình muốn được nhận món quà này. Cảm ơn đệ!`,
          createdAt: new Date().toISOString()
        });
      }

      onNotify('success', "Đang kết nối tới người tặng...");
      setSelectedItem(null);
      if (setActiveTab) setActiveTab('messages');
    } catch (err) {
      onNotify('error', "Không thể khởi tạo cuộc hội thoại.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || selectedMedia.length === 0) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "items"), {
        ...newPost,
        image: selectedMedia[0].url,
        author: user.name,
        authorId: user.id,
        status: 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      onNotify('success', "Đã đăng tặng thành công!");
      setNewPost({ title: '', category: CATEGORIES[0], condition: 'good', description: '', location: '', quantity: 1 });
      setSelectedMedia([]);
    } catch (err) {
      onNotify('error', "Có lỗi xảy ra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchCategory = selectedCategory === 'Tất cả' || item.category === selectedCategory;
    const matchSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchAdvanced = true;
    if (selectedCategory === 'Quần áo') {
      if (filterAge !== '') {
        matchAdvanced = matchAdvanced && (item.minAge !== undefined && item.maxAge !== undefined && item.minAge <= filterAge && item.maxAge >= filterAge);
      }
      if (filterWeight !== '') {
        matchAdvanced = matchAdvanced && (item.minWeight !== undefined && item.maxWeight !== undefined && item.minWeight <= filterWeight && item.maxWeight >= filterWeight);
      }
    } else if (selectedCategory === 'Sách vở') {
      if (filterAuthor) {
        matchAdvanced = matchAdvanced && (item.bookAuthor?.toLowerCase().includes(filterAuthor.toLowerCase()) ?? false);
      }
      if (filterGenre) {
        matchAdvanced = matchAdvanced && (item.bookGenre?.toLowerCase().includes(filterGenre.toLowerCase()) ?? false);
      }
    }

    return matchCategory && matchSearch && matchAdvanced;
  });

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto font-['Plus_Jakarta_Sans']">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-arial-950 dark:text-arial-50 italic uppercase tracking-tighter leading-none transition-colors">Sàn Tặng đồ</h1>
          <p className="text-arial-600 dark:text-arial-400 font-bold text-[10px] uppercase tracking-widest mt-4">Hỗ trợ bởi GIVEBACK AI Vision ✨</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-arial-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Đăng đồ tặng mới</button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-arial-50 dark:border-slate-800 mb-12 animate-in fade-in slide-in-from-top-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-arial-700 dark:text-arial-400 ml-4">Tìm kiếm chung</label>
            <input type="text" placeholder="Tên món đồ..." className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-arial-500 transition-all dark:text-white dark:placeholder:text-slate-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-arial-700 dark:text-arial-400 ml-4">Phân loại</label>
            <select className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-arial-500 transition-all font-bold dark:text-white" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              {['Tất cả', ...CATEGORIES].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {selectedCategory === 'Quần áo' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-arial-700 dark:text-arial-400 ml-4">Độ tuổi của bé (Năm)</label>
                <input type="number" placeholder="Vd: 5" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-arial-500 transition-all dark:text-white dark:placeholder:text-slate-500" value={filterAge} onChange={e => setFilterAge(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-arial-700 dark:text-arial-400 ml-4">Cân nặng (kg)</label>
                <input type="number" placeholder="Vd: 20" className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-arial-500 transition-all dark:text-white dark:placeholder:text-slate-500" value={filterWeight} onChange={e => setFilterWeight(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </>
          )}

          {selectedCategory === 'Sách vở' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-arial-700 dark:text-arial-400 ml-4">Tác giả</label>
                <input type="text" placeholder="Tên tác giả..." className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-arial-500 transition-all dark:text-white dark:placeholder:text-slate-500" value={filterAuthor} onChange={(e) => setFilterAuthor(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-arial-700 dark:text-arial-400 ml-4">Thể loại</label>
                <input type="text" placeholder="Vd: Giáo khoa, Truyện..." className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-arial-500 transition-all dark:text-white dark:placeholder:text-slate-500" value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredItems.map(item => (
          <ItemCard key={item.id} item={item} user={user} onSelect={(item) => setSelectedItem(item)} onNotify={onNotify} onViewProfile={onViewProfile} />
        ))}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 py-10">
          <div className="absolute inset-0 bg-arial-950/90 backdrop-blur-xl" onClick={() => setSelectedItem(null)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
             <div className="h-[400px] relative bg-gray-100 dark:bg-slate-800">
                <img src={selectedItem.image} className="w-full h-full object-cover" alt="" />
                <button onClick={() => setSelectedItem(null)} className="absolute top-8 right-8 bg-black/20 text-white p-3 rounded-full hover:bg-black/40 transition-all z-10">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="absolute bottom-8 left-8 flex gap-3">
                   <span className="bg-arial-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl italic">{selectedItem.category}</span>
                   <span className="bg-white dark:bg-slate-700 text-arial-900 dark:text-arial-100 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">{selectedItem.condition === 'new' ? 'Mới 100%' : 'Đã sử dụng'}</span>
                </div>
             </div>
             <div className="p-10">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-3xl font-black italic uppercase text-arial-950 dark:text-arial-50 tracking-tighter leading-none">{selectedItem.title}</h3>
                   <span className="text-xs font-black text-gray-400">SL: {selectedItem.quantity}</span>
                </div>
                
                <div className="bg-arial-50/50 dark:bg-arial-900/10 p-6 rounded-[2rem] border border-arial-50 dark:border-arial-800 mb-8">
                   <p className="text-arial-950 dark:text-arial-100 italic text-sm leading-relaxed">"{selectedItem.description || 'Chủ bài đăng chưa cung cấp mô tả chi tiết cho món quà này.'}"</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-10">
                   <div className="flex items-center space-x-3 cursor-pointer group/author" onClick={() => onViewProfile(selectedItem.authorId)}>
                      <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-arial-600 font-black text-xs group-hover/author:bg-arial-600 group-hover/author:text-white transition-all">{selectedItem.author.charAt(0)}</div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-gray-400">Người tặng</p>
                         <p className="text-xs font-bold text-gray-900 dark:text-arial-50 group-hover/author:text-arial-600 transition-colors">{selectedItem.author}</p>
                      </div>
                   </div>
                   <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-arial-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg></div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-gray-400">Khu vực</p>
                         <p className="text-xs font-bold text-gray-900 dark:text-arial-50 truncate">{selectedItem.location || 'Chưa xác định'}</p>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={() => handleStartChat(selectedItem)}
                  className="w-full bg-arial-950 dark:bg-arial-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] shadow-2xl transition-all hover:bg-black hover:scale-[1.02] active:scale-95"
                >
                  BẮT ĐẦU TRÒ CHUYỆN
                </button>
             </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-10">
          <div className="absolute inset-0 bg-arial-950/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[3.5rem] shadow-2xl p-8 md:p-12 animate-in zoom-in-95 h-fit max-h-[95vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black uppercase text-arial-950 dark:text-arial-50">Quà tặng từ tâm</h2>
                {isAiScanning && <div className="flex items-center gap-2 bg-arial-50 dark:bg-arial-900/30 px-4 py-2 rounded-full animate-pulse"><span className="text-[10px] font-black text-arial-600 dark:text-arial-400 uppercase">AI Scanning...</span></div>}
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <div className={`h-64 border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800 relative overflow-hidden group transition-all ${isAiScanning ? 'border-arial-400' : 'border-arial-100 dark:border-slate-700'}`}>
                         {selectedMedia.length > 0 ? (
                           <img src={selectedMedia[0].url} className="w-full h-full object-cover" alt="" />
                         ) : (
                           <div onClick={() => fileInputRef.current?.click()} className="text-center cursor-pointer">
                              <span className="text-[10px] font-black uppercase text-arial-300">Tải ảnh lên để AI quét</span>
                           </div>
                         )}
                         {isAiScanning && <div className="absolute inset-0 bg-arial-500/10 flex items-center justify-center"><div className="w-full h-1 bg-arial-500 absolute top-0 animate-scan"></div></div>}
                      </div>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-4 rounded-2xl bg-arial-50 dark:bg-arial-900/30 text-arial-600 dark:text-arial-400 text-[10px] font-black uppercase tracking-widest hover:bg-arial-100">Chọn hình ảnh</button>
                   </div>
                   <div className="space-y-4">
                      <input required className="w-full bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl font-bold outline-none dark:text-white border-2 border-transparent focus:border-arial-500" placeholder="Tên món đồ (AI gợi ý...)" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                      <select className="w-full bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl font-bold outline-none dark:text-white border-2 border-transparent focus:border-arial-500" value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="bg-arial-50/50 dark:bg-arial-900/10 p-6 rounded-[2rem] space-y-4 border border-arial-100 dark:border-arial-800 text-[11px] font-bold">
                        <p className="text-[10px] font-black text-arial-700 dark:text-arial-400 uppercase italic">Thông số AI quét được:</p>
                        {newPost.category === 'Quần áo' ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>Tuổi: <span className="text-arial-600">{newPost.minAge}-{newPost.maxAge}</span></div>
                            <div>Nặng: <span className="text-arial-600">{newPost.minWeight}-{newPost.maxWeight}kg</span></div>
                          </div>
                        ) : newPost.category === 'Sách vở' ? (
                          <div className="space-y-2">
                            <div>Tác giả: <span className="text-arial-600">{newPost.bookAuthor || '...'}</span></div>
                            <div>Thể loại: <span className="text-arial-600">{newPost.bookGenre || '...'}</span></div>
                          </div>
                        ) : <p className="text-gray-400 ">Đang chờ quét ảnh...</p>}
                      </div>
                   </div>
                </div>
                <textarea required rows={4} placeholder="Mô tả thêm..." className="w-full bg-gray-50 dark:bg-slate-800 p-6 rounded-[2.5rem] font-medium italic outline-none dark:text-white border-2 border-transparent focus:border-arial-500" value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} />
                <button type="submit" disabled={isSubmitting || isAiScanning} className="w-full bg-arial-950 dark:bg-arial-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] shadow-2xl transition-all hover:scale-[1.02] disabled:opacity-50">
                  {isSubmitting ? 'ĐANG ĐĂNG...' : 'ĐĂNG QUÀ TẶNG NGAY'}
                </button>
             </form>
             <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
