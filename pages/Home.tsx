
import React, { useState, useEffect, useRef } from 'react';
import ItemCard from '../components/ItemCard';
import { CATEGORIES } from '../constants';
import { DonationItem, User, ChatMessage, ChatSession } from '../types';
import { suggestDescription, analyzeItemImage } from '../services/geminiService';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  getDocs,
  limit
} from "firebase/firestore";
import { db } from '../services/firebase';

interface HomeProps {
  user: User;
}

const Home: React.FC<HomeProps> = ({ user }) => {
  const [items, setItems] = useState<DonationItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  
  // Chat states
  const [isChatView, setIsChatView] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Delivery states
  const [showDeliveryChoice, setShowDeliveryChoice] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingVision, setLoadingVision] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  
  // Media states
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const q = query(collection(db, "items"), where("createdAt", ">=", thirtyDaysAgo.toISOString()));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsData: any[] = [];
      querySnapshot.forEach((doc) => { itemsData.push({ id: doc.id, ...doc.data() }); });
      itemsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(itemsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatView]);

  // Lọc items dựa trên search term và category
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
      const isVideo = file.type.startsWith('video/');
      const mimeType = file.type;
      setMediaType(isVideo ? 'video' : 'image');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        setPreviewMedia(base64Data);
        if (!isVideo) {
          handleAIVision(base64Data, mimeType);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIVision = async (base64: string, mime: string) => {
    setLoadingVision(true);
    const analysis = await analyzeItemImage(base64, mime);
    if (analysis) {
      setNewPost(prev => ({
        ...prev,
        title: analysis.title || prev.title,
        category: CATEGORIES.includes(analysis.category) ? analysis.category : prev.category,
        condition: (['new', 'good', 'used'].includes(analysis.condition) ? analysis.condition : prev.condition) as any,
        description: analysis.description || prev.description
      }));
    }
    setLoadingVision(false);
  };

  const handleAISuggestion = async () => {
    if (!newPost.title) return alert("Nhập tên món đồ để AI gợi ý.");
    setLoadingAI(true);
    const suggestion = await suggestDescription(newPost.title, newPost.category);
    if (suggestion) setNewPost(prev => ({ ...prev, description: suggestion }));
    setLoadingAI(false);
  };

  const setupChat = async (item: DonationItem) => {
    const chatId = `${item.id}_${user.id}`;
    setCurrentChatId(chatId);
    const chatRef = doc(db, "chats", chatId);
    await setDoc(chatRef, {
      id: chatId,
      itemId: item.id,
      itemTitle: item.title,
      donorId: item.authorId,
      donorName: item.author,
      receiverId: user.id,
      receiverName: user.name,
      participants: [item.authorId, user.id],
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return chatId;
  };

  const handleStartChat = async () => {
    if (!selectedItem || !user) return;
    setIsChatView(true);
    const chatId = await setupChat(selectedItem);
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    });
  };

  const handleSendMessage = async (text: string, chatId: string) => {
    const chatMsg: ChatMessage = {
      senderId: user.id,
      senderName: user.name,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, "chats", chatId, "messages"), chatMsg);
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: text.trim(),
      lastSenderId: user.id,
      updatedAt: new Date().toISOString()
    });
  };

  const confirmClaim = async (method: 'pickup' | 'ship') => {
    if (!selectedItem || selectedItem.quantity <= 0) return;
    setIsClaiming(true);
    try {
      await updateDoc(doc(db, "items", selectedItem.id), { quantity: selectedItem.quantity - 1 });
      const chatId = await setupChat(selectedItem);
      const autoMsg = method === 'pickup' 
        ? `Chào bạn, mình muốn đăng ký nhận món đồ này theo hình thức: TỰ ĐẾN LẤY. Bạn cho mình xin địa chỉ cụ thể nhé!`
        : `Chào bạn, mình muốn đăng ký nhận món đồ này qua hình thức: GỬI SHIPPER. Mình sẽ chịu phí vận chuyển khi nhận hàng (Ship COD phí).`;
      await handleSendMessage(autoMsg, chatId);
      setSelectedItem(prev => prev ? { ...prev, quantity: prev.quantity - 1 } : null);
      setShowDeliveryChoice(false);
      setIsChatView(true);
      alert("Đã đăng ký nhận đồ thành công! Hãy trao đổi thêm với người tặng trong phần chat.");
    } catch (err) { console.error(err); } finally { setIsClaiming(false); }
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
      setNewPost({ title: '', category: CATEGORIES[0], condition: 'good', description: '', location: '', contact: '', quantity: 1 });
      setPreviewMedia(null);
    } catch (err) { alert(err); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
      {/* Header & Search Section */}
      <div className="flex flex-col space-y-8 mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-4xl font-black text-gray-900 italic uppercase tracking-tighter">Món đồ trao đi</h1>
            <p className="text-emerald-600 mt-1 font-black text-xs uppercase tracking-[0.3em] ml-1 italic underline decoration-emerald-200 decoration-4">Sàn chia sẻ yêu thương trực tuyến</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 group">
            <span>Đăng tin tặng đồ</span>
          </button>
        </div>

        {/* Search Hub */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-emerald-900/5 border border-emerald-50 space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Tìm kiếm sách vở, quần áo, đồ gia dụng..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-full py-4 pl-14 pr-6 text-sm font-bold text-gray-700 outline-none transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
            {['Tất cả', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedCategory === cat 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 scale-105' 
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Items */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} user={user} onSelect={(item) => { setSelectedItem(item); setIsChatView(false); setShowDeliveryChoice(false); }} />
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="bg-emerald-50 p-6 rounded-full text-emerald-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] italic">Không tìm thấy món đồ nào phù hợp</p>
          <button onClick={() => { setSearchTerm(''); setSelectedCategory('Tất cả'); }} className="text-emerald-600 text-xs font-bold uppercase underline">Xóa bộ lọc</button>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md" onClick={() => setSelectedItem(null)}></div>
          <div className="relative bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col lg:flex-row h-[90vh] lg:min-h-[500px] lg:h-auto max-h-[95vh]">
            <div className="relative w-full lg:w-1/2 bg-gray-100 h-64 lg:h-auto">
              {selectedItem.video ? (
                <video src={selectedItem.video} controls className="w-full h-full object-cover" />
              ) : (
                <img src={selectedItem.image} className="w-full h-full object-cover" alt="" />
              )}
              <div className="absolute top-6 left-6 z-10">
                <span className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl font-black uppercase text-[10px] text-emerald-900 shadow-lg">
                  {selectedItem.category}
                </span>
              </div>
            </div>
            
            <div className="w-full lg:w-1/2 flex flex-col h-full bg-white relative">
              <div className="p-8 border-b flex justify-between items-start bg-emerald-50/20">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter line-clamp-1">{selectedItem.title}</h2>
                  <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest">Người tặng: {selectedItem.author}</p>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-2 text-gray-400 hover:text-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {showDeliveryChoice ? (
                  <div className="p-8 flex-1 flex flex-col justify-center animate-in slide-in-from-right-4 duration-300">
                    <button onClick={() => setShowDeliveryChoice(false)} className="mb-6 text-[10px] font-black text-emerald-600 uppercase flex items-center space-x-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                       <span>Quay lại chi tiết</span>
                    </button>
                    <h3 className="text-xl font-black text-emerald-900 uppercase italic mb-2">Chọn cách nhận đồ</h3>
                    <div className="space-y-4">
                      <button onClick={() => confirmClaim('pickup')} className="w-full p-6 bg-white border-2 border-emerald-50 hover:border-emerald-500 rounded-[2rem] text-left transition-all group flex items-center space-x-6">
                        <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                          <p className="font-black text-gray-900 uppercase tracking-tight">Tự đến nhận đồ</p>
                          <p className="text-[10px] text-gray-400 italic">Bạn sẽ chủ động qua địa chỉ của người tặng.</p>
                        </div>
                      </button>
                      <button onClick={() => confirmClaim('ship')} className="w-full p-6 bg-white border-2 border-emerald-50 hover:border-emerald-500 rounded-[2rem] text-left transition-all group flex items-center space-x-6">
                        <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                        </div>
                        <div>
                          <p className="font-black text-gray-900 uppercase tracking-tight">Gửi qua Shipper</p>
                          <p className="text-[10px] text-gray-400 italic">Nhận đồ tại nhà. Bạn thanh toán phí vận chuyển.</p>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : !isChatView ? (
                  <div className="p-8 space-y-6 overflow-y-auto">
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 italic text-gray-600 leading-relaxed">"{selectedItem.description}"</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Số lượng</p>
                        <p className="font-black text-emerald-600">{selectedItem.quantity > 0 ? `${selectedItem.quantity} món` : 'Hết hàng'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Khu vực</p>
                        <p className="font-bold text-gray-800 line-clamp-1">{selectedItem.location}</p>
                      </div>
                    </div>
                    <div className="pt-4 space-y-4">
                      <button onClick={handleStartChat} className="w-full bg-emerald-100 text-emerald-700 py-4 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-emerald-200 transition-all flex items-center justify-center space-x-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
                        <span>Nhắn tin trao đổi</span>
                      </button>
                      <button disabled={selectedItem.quantity <= 0 || isClaiming} onClick={() => setShowDeliveryChoice(true)} className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-2xl shadow-emerald-100 active:scale-95 disabled:opacity-50 transition-all">
                        {isClaiming ? 'Đang xử lý...' : (selectedItem.quantity > 0 ? 'Nhận đồ ngay' : 'Đã được tặng hết')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full bg-gray-50/50">
                    <div className="bg-emerald-600/5 px-8 py-2 border-b flex items-center">
                      <button onClick={() => setIsChatView(false)} className="text-emerald-600 text-xs font-black uppercase flex items-center space-x-1 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        <span>Quay lại chi tiết</span>
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {messages.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.senderId === user.id ? 'items-end' : 'items-start'}`}>
                          <span className="text-[8px] font-black text-gray-400 uppercase mb-1 px-2">{m.senderName}</span>
                          <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${m.senderId === user.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-gray-700 border border-emerald-50 rounded-tl-none'}`}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef}></div>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); if(newMessage.trim() && currentChatId) { handleSendMessage(newMessage, currentChatId); setNewMessage(''); } }} className="p-6 bg-white border-t flex space-x-3">
                      <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Nhập tin nhắn..." className="flex-1 bg-gray-100 border-none rounded-2xl px-6 py-3 outline-none focus:ring-2 focus:ring-emerald-500 font-medium" />
                      <button type="submit" className="bg-emerald-600 text-white p-3 rounded-2xl hover:scale-105 transition-transform shadow-lg shadow-emerald-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-8 border-b flex justify-between items-center bg-emerald-50/50">
              <div>
                <h2 className="text-2xl font-black text-emerald-900 uppercase italic tracking-tight">Đăng món đồ tặng</h2>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Tải ảnh lên để AI tự động điền thông tin</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-emerald-900/50 hover:text-emerald-900 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[80vh]">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-gray-400 mb-2">Tên món đồ</label>
                      <input required className={`w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 transition-all outline-none focus:ring-2 focus:ring-emerald-500 ${loadingVision ? 'animate-pulse border-emerald-200' : 'border-transparent'}`} value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-black uppercase text-gray-400 mb-2">Danh mục</label>
                      <select className={`w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 transition-all outline-none focus:ring-2 focus:ring-emerald-500 ${loadingVision ? 'animate-pulse border-emerald-200' : 'border-transparent'}`} value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})}>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-black uppercase text-gray-400">Mô tả chi tiết</label>
                        <button type="button" onClick={handleAISuggestion} disabled={loadingAI} className="text-[10px] font-black text-emerald-600 uppercase hover:underline disabled:opacity-50">
                          {loadingAI ? 'Đang tạo...' : 'AI viết lại mô tả'}
                        </button>
                      </div>
                      <textarea rows={4} className={`w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 transition-all outline-none focus:ring-2 focus:ring-emerald-500 ${loadingVision ? 'animate-pulse border-emerald-200' : 'border-transparent'}`} value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="block text-xs font-black uppercase text-gray-400 mb-2">Liên hệ</label><input required className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-emerald-500" value={newPost.contact} onChange={e => setNewPost({...newPost, contact: e.target.value})} /></div>
                       <div><label className="block text-xs font-black uppercase text-gray-400 mb-2">Khu vực</label><input required className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-emerald-500" value={newPost.location} onChange={e => setNewPost({...newPost, location: e.target.value})} /></div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className={`flex-1 bg-gray-50 rounded-[2rem] border-4 border-dashed transition-all relative overflow-hidden flex flex-col items-center justify-center p-6 text-gray-400 min-h-[300px] ${loadingVision ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'}`}>
                      {loadingVision && (
                        <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
                          <div className="w-full h-1 bg-emerald-500 absolute top-0 animate-[scan_2s_infinite]"></div>
                          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                            <span className="text-emerald-600 text-xs font-black uppercase animate-pulse">AI GIVEBACK đang nhìn...</span>
                          </div>
                        </div>
                      )}

                      {!previewMedia ? (
                        <>
                          <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </div>
                          <p className="font-bold text-sm italic mb-2 text-emerald-900">Chưa có hình ảnh</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest text-center">Tải ảnh để AI giúp bạn điền form nhanh hơn</p>
                        </>
                      ) : (
                        <div className="w-full h-full relative rounded-2xl overflow-hidden group">
                          {mediaType === 'video' ? <video src={previewMedia} className="w-full h-full object-cover" muted /> : <img src={previewMedia} className="w-full h-full object-cover" alt="Preview" />}
                          <button type="button" onClick={() => setPreviewMedia(null)} className="absolute top-4 right-4 bg-red-500 text-white rounded-xl p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                    </div>
                    
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 w-full bg-emerald-50 text-emerald-600 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center justify-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span>Chọn ảnh từ thiết bị</span>
                    </button>
                  </div>
               </div>
               
               <div className="mt-8 flex justify-end">
                <button type="submit" disabled={isSubmitting || loadingVision} className="bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-colors active:scale-95 disabled:opacity-50">
                  {isSubmitting ? 'Đang đăng...' : 'Hoàn tất đăng tin'}
                </button>
               </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Home;
