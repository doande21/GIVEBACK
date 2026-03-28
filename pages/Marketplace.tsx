
import React, { useState, useEffect, useRef } from 'react';
import ItemCard from '../components/ItemCard';
import { CATEGORIES } from '../constants';
import { DonationItem, User, PostMedia } from '../types';

import { uploadFile } from '../services/storageService';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  doc,
  setDoc,
  getDoc,
  getDocs,
  where
} from "firebase/firestore";

import { db } from '../services/firebase';
import { analyzeDonationItem } from '../services/geminiService';
// Tự động load file ảnh có sẵn trong thư mục gốc
import logoImg from '../giveback_logo.png';

const calculateAITrustScore = (donated: number, received: number) => {
  if (donated === 0 && received === 0) {
    return { score: 50, label: 'Tài khoản mới', color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', icon: '🌱', desc: 'Tài khoản mới tạo. Chưa có dữ liệu giao dịch.' };
  }
  let score = 50 + (donated * 15) - (received * 10);
  if (score > 100) score = 100;
  if (score < 10) score = 10;
  if (score >= 70) return { score, label: 'Uy tín cao', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: '🏅', desc: `Tài khoản uy tín. Đã tặng ${donated} món, nhận ${received} món.` };
  if (score >= 40) return { score, label: 'Bình thường', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: '⚖️', desc: `Tài khoản tiêu chuẩn. Đã tặng ${donated} món, nhận ${received} món.` };
  return { score, label: 'Cảnh báo thu gom', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: '⚠️', desc: `Nguy cơ gom hàng! Đã nhận ${received} món nhưng chỉ tặng ${donated} món.` };
};

const compressImage = (base64Str: string, maxWidth = 600, quality = 0.5): Promise<string> => {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width; let height = img.height;
      if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
      else { if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

interface MarketplaceProps {
  user: User;
  onNotify: (type: string, message: string, sender?: string) => void;
  onConfirm?: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info') => void;
  setActiveTab?: (tab: string) => void;
  onViewProfile: (userId: string) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ user, onNotify, onConfirm, setActiveTab, onViewProfile }) => {
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
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [authorAiData, setAuthorAiData] = useState<any>(null);
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

  useEffect(() => {
    if (!selectedItem) { setAuthorAiData(null); return; }
    const fetchAuthorScore = async () => {
      try {
        const [dSnap, rSnap] = await Promise.all([
          getDocs(query(collection(db, "items"), where("authorId", "==", selectedItem.authorId))),
          getDocs(query(collection(db, "claims"), where("receiverId", "==", selectedItem.authorId)))
        ]);
        setAuthorAiData(calculateAITrustScore(dSnap.size, rSnap.size));
      } catch { setAuthorAiData(null); }
    };
    fetchAuthorScore();
  }, [selectedItem]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsAiScanning(true);
    const firstFile: File = files[0];

    
    try {
      // 1. Read as base64 for AI analysis
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(firstFile);
      });
      const base64 = await base64Promise;
      const compressedBase64 = await compressImage(base64);

      // 2. Upload to storage for permanent link
      onNotify('info', "Đang tải ảnh lên kho lưu trữ...", "Hệ thống");
      const url = await uploadFile(firstFile, 'items');
      setSelectedMedia([{ url, type: 'image' }]);
      
      // 3. Analyze using compressed base64 (Gemini SDK expects base64 for inlineData)

      onNotify('info', "AI đang quét dữ liệu hình ảnh...", "GIVEBACK AI");
      const aiData = await analyzeDonationItem(compressedBase64, newPost.description);
      
      if (aiData) {
        setNewPost((prev: any) => ({
          ...prev, title: aiData.suggestedTitle || prev.title, category: aiData.category || prev.category,
          description: aiData.detailedDescription || prev.description, condition: aiData.condition || prev.condition,
          quantity: aiData.quantity || prev.quantity || 1, minAge: aiData.minAge || 0, maxAge: aiData.maxAge || 0,
          minWeight: aiData.minWeight || 0, maxWeight: aiData.maxWeight || 0,
          bookAuthor: aiData.bookAuthor || '', bookGenre: aiData.bookGenre || ''
        }));
        onNotify('success', "AI đã quét thông tin thành công!", "GIVEBACK AI");
      }
    } catch (err) {
      console.error("Upload/AI Error:", err);
      onNotify('error', "Lỗi tải ảnh hoặc quét AI.");
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleStartChat = async (item: DonationItem) => {
    if (item.authorId === user.id) { onNotify('warning', "bạn không thể tự nhắn tin cho chính mình nhé!"); return; }
    const chatId = item.id < user.id ? `chat_${item.id}_${user.id}` : `chat_${user.id}_${item.id}`;
    try {
      const chatRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatRef);
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          id: chatId, type: 'direct', itemId: item.id, itemTitle: item.title, itemImage: item.image,
          donorId: item.authorId, donorName: item.author, receiverId: user.id, receiverName: user.name,
          participants: [item.authorId, user.id],
          lastMessage: `Chào bạn, mình muốn hỏi về món đồ "${item.title}"...`,
          lastSenderId: user.id, updatedAt: new Date().toISOString(), giftStatus: 'negotiating'
        });
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: user.id, senderName: user.name,
          text: `Chào bạn, mình thấy bạn đang tặng "${item.title}", mình muốn được nhận món quà này. Cảm ơn bạn!`,
          createdAt: new Date().toISOString()
        });
      }
      onNotify('success', "Đang kết nối tới người tặng...");
      setSelectedItem(null);
      if (setActiveTab) setActiveTab('messages');
    } catch (err) { onNotify('error', "Không thể khởi tạo cuộc hội thoại."); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || selectedMedia.length === 0) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "items"), {
        ...newPost, image: selectedMedia[0].url, author: user.name, authorId: user.id,
        status: 'available', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      onNotify('success', "Đã đăng tặng thành công!");
      setNewPost({ title: '', category: CATEGORIES[0], condition: 'good', description: '', location: '', quantity: 1 });
      setSelectedMedia([]);
    } catch (err) { onNotify('error', "Có lỗi xảy ra."); }
    finally { setIsSubmitting(false); }
  };

  const filteredItems = items.filter(item => {
    const matchCategory = selectedCategory === 'Tất cả' || item.category === selectedCategory;
    const matchSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || item.description.toLowerCase().includes(searchTerm.toLowerCase());
    let matchAdvanced = true;
    if (selectedCategory === 'Quần áo') {
      if (filterAge !== '') matchAdvanced = matchAdvanced && (item.minAge !== undefined && item.maxAge !== undefined && item.minAge <= filterAge && item.maxAge >= filterAge);
      if (filterWeight !== '') matchAdvanced = matchAdvanced && (item.minWeight !== undefined && item.maxWeight !== undefined && item.minWeight <= filterWeight && item.maxWeight >= filterWeight);
    } else if (selectedCategory === 'Sách vở') {
      if (filterAuthor) matchAdvanced = matchAdvanced && (item.bookAuthor?.toLowerCase().includes(filterAuthor.toLowerCase()) ?? false);
      if (filterGenre) matchAdvanced = matchAdvanced && (item.bookGenre?.toLowerCase().includes(filterGenre.toLowerCase()) ?? false);
    }
    return matchCategory && matchSearch && matchAdvanced;
  });

  const categoryIcons: {[key:string]: string} = {
    'Quần áo': '👕', 'Giày dép': '👟', 'Sách vở': '📚', 'Đồ chơi': '🧸', 'Điện tử': '📱', 'Đồ gia dụng': '🏠', 'Khác': '📦'
  };

  const features = [
    { icon: '🤖', title: 'AI Xác thực', desc: 'Công nghệ nhận diện đồ bằng AI, giúp phân loại tự động.' },
    { icon: '🚀', title: 'Trao tặng nhanh', desc: 'Đăng tải và kết nối người nhận chỉ trong vài phút.' },
    { icon: '🌐', title: 'Cộng đồng văn minh', desc: 'Hệ thống xác thực và đánh giá, cộng đồng uy tín.' },
    { icon: '🔒', title: 'Minh bạch', desc: 'Theo dõi hành trình món quà, xác nhận đã trao đến nơi.' },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* ===== HERO SECTION ===== */}
      <section className="hero-gradient relative overflow-hidden pt-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <p className="text-emerald-400 text-xs font-bold tracking-widest mb-4 flex items-center gap-2">
                <span className="w-8 h-[2px] bg-emerald-500"></span> NỀN TẢNG SẺ CHIA SỐ 1 VIỆT NAM
              </p>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.2] mb-6">
                SÀN TẶNG ĐỒ<br/>
                <span className="text-emerald-400">— TRAO YÊU</span><br/>
                <span className="text-emerald-300">THƯƠNG</span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8 max-w-md">
                Khám phá nền tảng trao tặng đồ cũ còn mới tốt, kết nối tấm lòng bao dung với người cần nhận, tất cả trong một ứng dụng hiện đại.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-emerald-900/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Đăng đồ tặng mới
                </button>
                <button onClick={() => document.getElementById('items-section')?.scrollIntoView({behavior:'smooth'})} className="border border-gray-700 hover:border-emerald-600 text-gray-300 hover:text-emerald-400 px-8 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  Xem đồ tặng
                </button>
              </div>
            </div>
            <div className="hidden md:flex justify-center relative">
              
              {/* Vòng tròn trang trí phía sau (Concentric rings like in mockup) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-gray-800/60 border-dashed"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-gray-800/80"></div>

              {/* Ảnh chính */}
              <div className="relative animate-float z-10">
                <img 
                  src={logoImg} 
                  alt="GIVEBACK Logo" 
                  className="w-80 h-80 rounded-full object-cover shadow-[0_0_50px_rgba(4,93,67,0.3)] border-4 border-[#0d1117]"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/045d43/FFF?text=GIVEBACK'; }}
                />

                {/* Badge Góc Trên Phải: Đã Tặng */}
                <div className="absolute -top-2 -right-6 bg-[#151b23] border border-gray-700/60 rounded-full pl-2 pr-4 py-2 shadow-xl animate-fade-in-up flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-[9px] font-semibold leading-none">Đã Tặng</span>
                    <span className="text-white text-[11px] font-bold mt-0.5 leading-none">12.5k món đồ</span>
                  </div>
                </div>

                {/* Badge Góc Dưới Trái: Tốc độ */}
                <div className="absolute -bottom-4 -left-6 bg-[#151b23] border border-gray-700/60 rounded-full pl-2 pr-4 py-2 shadow-xl animate-fade-in-up flex items-center gap-2" style={{animationDelay: '0.2s'}}>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-[9px] font-semibold leading-none">Tốc độ</span>
                    <span className="text-white text-[11px] font-bold mt-0.5 leading-none">Dưới 15 phút</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-t border-gray-800/50 bg-[#0d1117]/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-3 gap-8">
            {[
              { num: '1000+', label: 'thành viên' },
              { num: '500+', label: 'món đồ đã tặng' },
              { num: '4.9 ★', label: 'đánh giá' },
            ].map((s, i) => (
              <div key={i} className="text-center animate-count-up" style={{animationDelay: `${i*0.2}s`}}>
                <p className="text-2xl md:text-3xl font-black text-white">{s.num}</p>
                <p className="text-gray-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHY GIVEBACK ===== */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Tại sao chọn <span className="text-emerald-400">GIVEBACK</span>?</h2>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">Chúng tôi xây dựng nền tảng mà bạn có thể tin tưởng, dễ sử dụng và đóng góp cho cộng đồng.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 hover:border-emerald-700/50 transition-all group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{f.icon}</div>
              <h3 className="text-white font-bold text-sm mb-2">{f.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CATEGORIES ===== */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white">Khám phá theo <span className="italic text-emerald-400">danh mục</span></h2>
            <p className="text-gray-500 text-xs mt-1">Chọn 1 trong các danh mục để tìm món đồ phù hợp nhất</p>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          <button onClick={() => setSelectedCategory('Tất cả')} className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${selectedCategory === 'Tất cả' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'bg-[#151b23] text-gray-400 border border-gray-800 hover:border-emerald-700/50 hover:text-emerald-400'}`}>
            📋 Tất cả
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'bg-[#151b23] text-gray-400 border border-gray-800 hover:border-emerald-700/50 hover:text-emerald-400'}`}>
              {categoryIcons[cat] || '📦'} {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ===== SEARCH & FILTERS ===== */}
      <section className="max-w-7xl mx-auto px-4 pb-6">
        <div className="bg-[#151b23] p-5 rounded-2xl border border-gray-800/60">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-emerald-400 ml-3">Tìm kiếm</label>
              <input type="text" placeholder="Tên món đồ..." className="w-full px-4 py-3 bg-[#0d1117] rounded-xl text-sm outline-none border border-gray-800 focus:border-emerald-500 transition-all text-gray-200 placeholder:text-gray-600" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-emerald-400 ml-3">Phân loại</label>
              <select className="w-full px-4 py-3 bg-[#0d1117] rounded-xl text-sm outline-none border border-gray-800 focus:border-emerald-500 transition-all text-gray-200 font-semibold" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                {['Tất cả', ...CATEGORIES].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {selectedCategory === 'Quần áo' && (<>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-emerald-400 ml-3">Độ tuổi (Năm)</label>
                <input type="number" placeholder="Vd: 5" className="w-full px-4 py-3 bg-[#0d1117] rounded-xl text-sm outline-none border border-gray-800 focus:border-emerald-500 text-gray-200 placeholder:text-gray-600" value={filterAge} onChange={e => setFilterAge(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-emerald-400 ml-3">Cân nặng (kg)</label>
                <input type="number" placeholder="Vd: 20" className="w-full px-4 py-3 bg-[#0d1117] rounded-xl text-sm outline-none border border-gray-800 focus:border-emerald-500 text-gray-200 placeholder:text-gray-600" value={filterWeight} onChange={e => setFilterWeight(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </>)}
            {selectedCategory === 'Sách vở' && (<>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-emerald-400 ml-3">Tác giả</label>
                <input type="text" placeholder="Tên tác giả..." className="w-full px-4 py-3 bg-[#0d1117] rounded-xl text-sm outline-none border border-gray-800 focus:border-emerald-500 text-gray-200 placeholder:text-gray-600" value={filterAuthor} onChange={(e) => setFilterAuthor(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-emerald-400 ml-3">Thể loại</label>
                <input type="text" placeholder="Vd: Giáo khoa..." className="w-full px-4 py-3 bg-[#0d1117] rounded-xl text-sm outline-none border border-gray-800 focus:border-emerald-500 text-gray-200 placeholder:text-gray-600" value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} />
              </div>
            </>)}
          </div>
        </div>
      </section>

      {/* ===== ITEMS GRID ===== */}
      <section id="items-section" className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-white">Đồ tặng <span className="italic text-emerald-400">phổ biến</span></h2>
          <span className="text-gray-600 text-xs">{filteredItems.length} món đồ</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} user={user} onSelect={(item) => setSelectedItem(item)} onNotify={onNotify} onConfirm={onConfirm} onViewProfile={onViewProfile} />
          ))}
        </div>
        {filteredItems.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-gray-500 text-sm">Không tìm thấy món đồ nào phù hợp.</p>
          </div>
        )}
      </section>

      {/* ===== AI SECTION ===== */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-emerald-900/40 to-[#151b23] rounded-3xl p-8 md:p-12 border border-emerald-800/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-4">Phân loại đồ tặng<br/><span className="italic text-emerald-400">thông minh với AI</span></h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">Công nghệ GIVEBACK AI sử dụng Computer Vision để nhận diện, phân loại và đánh giá chất lượng đồ vật. Tất cả chỉ cần 1 tấm ảnh, không cần điền thủ công.</p>
              <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 flex items-center gap-2">
                🤖 Thử phân loại AI
              </button>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="bg-[#0d1117] rounded-2xl p-6 border border-gray-800 w-full max-w-xs">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-emerald-400 text-xs font-bold">GIVEBACK AI VISION</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm"><span className="text-gray-500">Có, đây là áo khoác denim, cỡ...</span></div>
                  <div className="bg-emerald-900/20 rounded-lg p-3 border border-emerald-800/30">
                    <p className="text-emerald-400 text-[10px] font-bold mb-1">AI Phân tích:</p>
                    <p className="text-gray-300 text-xs">Tình trạng: <span className="text-emerald-400">Tốt</span></p>
                    <p className="text-gray-300 text-xs">Danh mục: <span className="text-emerald-400">Quần áo</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-gray-800/50 bg-[#0a0e14]">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-emerald-600 p-1.5 rounded-lg"><svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>
                <span className="text-white font-black tracking-tighter">GIVEBACK</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">Nền tảng chia sẻ yêu thương, kết nối cộng đồng Việt Nam.</p>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-3">Liên kết nhanh</h4>
              <div className="space-y-2">
                {[{label:'Sàn đồ', tab:'market'}, {label:'Đấu giá', tab:'auction'}, {label:'Bản đồ', tab:'map'}, {label:'Bản tin', tab:'home'}, {label:'Tri ân', tab:'sponsors'}].map(l => <p key={l.tab} onClick={() => { if(setActiveTab) setActiveTab(l.tab); window.scrollTo(0,0); }} className="text-gray-500 text-xs hover:text-emerald-400 cursor-pointer transition-colors">{l.label}</p>)}
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-3">Hỗ trợ</h4>
              <div className="space-y-2">
                {['Trung tâm trợ giúp', 'Chính sách', 'Điều khoản'].map(l => <p key={l} className="text-gray-500 text-xs hover:text-emerald-400 cursor-pointer transition-colors">{l}</p>)}
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-3">Liên hệ</h4>
              <div className="space-y-2">
                <p className="text-gray-500 text-xs">📧 hello@giveback.vn</p>
                <p className="text-gray-500 text-xs">📱 0333297621</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800/50 mt-8 pt-6 text-center">
            <p className="text-gray-600 text-xs">© 2026 GIVEBACK. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </footer>

      {/* ===== MODALS (giữ nguyên logic) ===== */}
      {selectedItem && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 py-8 md:py-12">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setSelectedItem(null)}></div>
          <div className="relative bg-[#151b23] w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300 border border-gray-800 max-h-[90vh]">
            
            {/* Ảnh bên trái */}
            <div className="w-full md:w-1/2 shrink-0 relative bg-gray-900 h-[250px] md:h-auto border-b md:border-b-0 md:border-r border-gray-800 overflow-hidden group">
              <img 
                src={selectedItem.image} 
                className="w-full h-full object-cover opacity-90 absolute inset-0 cursor-pointer transition-transform duration-500 group-hover:scale-105" 
                alt="" 
                onClick={() => setFullscreenImage(selectedItem.image)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151b23] via-transparent to-transparent md:bg-gradient-to-r md:from-[#151b23]/10 md:to-[#151b23] pointer-events-none transition-opacity group-hover:opacity-60"></div>
              
              {/* Nút phóng to ảnh */}
              <button 
                onClick={() => setFullscreenImage(selectedItem.image)}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white p-4 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-black/90 hover:scale-110 z-20 backdrop-blur-md shadow-2xl hidden md:flex items-center justify-center gap-2"
                title="Phóng to ảnh"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              </button>
              
              {/* Nút tắt trên Mobile */}
              <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 bg-black/40 text-white p-2.5 rounded-full hover:bg-black/60 transition-all z-10 backdrop-blur-sm md:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2 z-10">
                <span className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold tracking-wide">{selectedItem.category}</span>
                <span className="bg-gray-800/80 backdrop-blur-sm text-gray-200 px-4 py-1.5 rounded-lg text-[10px] font-bold">{selectedItem.condition === 'new' ? 'Mới 100%' : 'Đã sử dụng'}</span>
              </div>
            </div>

            {/* Nội dung bên phải */}
            <div className="w-full md:w-1/2 p-6 md:p-8 xl:p-10 overflow-y-auto flex flex-col relative bg-[#151b23]">
              {/* Nút tắt trên Desktop */}
              <button onClick={() => setSelectedItem(null)} className="hidden md:flex absolute top-6 right-6 bg-gray-800/40 text-gray-400 hover:text-white hover:bg-gray-700/80 p-2.5 rounded-2xl transition-all z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="flex flex-col mb-4 pr-0 md:pr-14">
                <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">{selectedItem.title}</h3>
                <span className="text-xs font-bold text-gray-500">Số lượng: {selectedItem.quantity}</span>
              </div>

              <div className="bg-[#0d1117] p-5 md:p-6 rounded-2xl border border-gray-800/60 mb-8 flex-grow">
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{selectedItem.description || 'Chưa có mô tả chi tiết cho món đồ này.'}</p>
              </div>

              <div className="flex flex-col gap-3 mb-6">
                <div className="flex items-center space-x-4 cursor-pointer group/author bg-gray-800/20 p-3.5 rounded-2xl hover:bg-gray-800/40 transition-all border border-transparent hover:border-gray-700" onClick={() => onViewProfile(selectedItem.authorId)}>
                  <div className="w-11 h-11 rounded-xl bg-emerald-900/40 flex items-center justify-center text-emerald-400 font-bold text-lg group-hover/author:bg-emerald-600 group-hover/author:text-white transition-all shadow-inner shrink-0">{selectedItem.author.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">Người tặng</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-bold text-gray-200 group-hover/author:text-emerald-400 transition-colors break-words">{selectedItem.author}</p>
                      {authorAiData && (
                        <span title={authorAiData.desc} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${authorAiData.color}`}>
                          {authorAiData.icon} {authorAiData.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 bg-gray-800/20 p-3.5 rounded-2xl border border-transparent">
                  <div className="w-11 h-11 rounded-xl bg-emerald-900/40 flex items-center justify-center text-emerald-400 shadow-inner shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg></div>
                  <div className="flex-1 min-w-0"><p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">Khu vực</p><p className="text-[14px] font-bold text-gray-200 break-words">{selectedItem.location || 'Chưa xác định'}</p></div>
                </div>
              </div>

              <button onClick={() => handleStartChat(selectedItem)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 md:py-5 rounded-2xl font-black tracking-wide shadow-xl shadow-emerald-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-auto flex items-center justify-center gap-3 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                BẮT ĐẦU TRÒ CHUYỆN
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-10">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-[#151b23] w-full max-w-3xl rounded-3xl shadow-2xl p-8 md:p-10 animate-in zoom-in-95 h-fit max-h-[95vh] overflow-y-auto border border-gray-800">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-white">Quà tặng từ tâm</h2>
              {isAiScanning && <div className="flex items-center gap-2 bg-emerald-900/30 px-3 py-1.5 rounded-full animate-pulse border border-emerald-800/30"><span className="text-[10px] font-bold text-emerald-400">AI Scanning...</span></div>}
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className={`h-56 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-[#0d1117] relative overflow-hidden group transition-all ${isAiScanning ? 'border-emerald-500' : 'border-gray-700'}`}>
                    {selectedMedia.length > 0 ? (
                      <img src={selectedMedia[0].url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div onClick={() => fileInputRef.current?.click()} className="text-center cursor-pointer p-6">
                        <p className="text-3xl mb-2">📸</p>
                        <span className="text-xs font-bold text-gray-500">Tải ảnh lên để AI quét</span>
                      </div>
                    )}
                    {isAiScanning && <div className="absolute inset-0 bg-emerald-500/5 flex items-center justify-center"><div className="w-full h-1 bg-emerald-500 absolute top-0 animate-scan"></div></div>}
                  </div>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-3 rounded-xl bg-emerald-900/20 text-emerald-400 text-xs font-bold hover:bg-emerald-900/40 border border-emerald-800/30 transition-all">Chọn hình ảnh</button>
                </div>
                <div className="space-y-3">
                  <input required className="w-full bg-[#0d1117] p-3.5 rounded-xl font-semibold outline-none text-gray-200 border border-gray-800 focus:border-emerald-500 text-sm" placeholder="Tên món đồ (AI gợi ý...)" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                  <select className="w-full bg-[#0d1117] p-3.5 rounded-xl font-semibold outline-none text-gray-200 border border-gray-800 focus:border-emerald-500 text-sm" value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="grid grid-cols-3 gap-3">
                    <input type="number" min="1" className="w-full bg-[#0d1117] p-3.5 rounded-xl font-semibold outline-none text-gray-200 border border-gray-800 focus:border-emerald-500 text-sm" placeholder="SL" value={newPost.quantity} onChange={e => setNewPost({...newPost, quantity: parseInt(e.target.value) || 1})} />
                    <input required className="col-span-2 w-full bg-[#0d1117] p-3.5 rounded-xl font-semibold outline-none text-gray-200 border border-gray-800 focus:border-emerald-500 text-sm" placeholder="Địa chỉ..." value={newPost.location} onChange={e => setNewPost({...newPost, location: e.target.value})} />
                  </div>
                  <div className="bg-emerald-900/10 p-4 rounded-xl border border-emerald-800/20 text-xs">
                    <p className="text-emerald-400 font-bold text-[10px] mb-2">AI quét được:</p>
                    <div className="grid grid-cols-2 gap-2 text-gray-400">
                      <span>Tình trạng: <span className="text-emerald-400">{newPost.condition === 'new' ? 'Mới' : 'Tốt'}</span></span>
                      <span>Số lượng: <span className="text-emerald-400">{newPost.quantity}</span></span>
                    </div>
                  </div>
                </div>
              </div>
              <textarea required rows={3} placeholder="Mô tả thêm..." className="w-full bg-[#0d1117] p-4 rounded-2xl outline-none text-gray-200 border border-gray-800 focus:border-emerald-500 text-sm" value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} />
              <button type="submit" disabled={isSubmitting || isAiScanning} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold tracking-wide shadow-xl shadow-emerald-900/30 transition-all hover:scale-[1.01] disabled:opacity-50">
                {isSubmitting ? 'ĐANG ĐĂNG...' : 'ĐĂNG QUÀ TẶNG NGAY'}
              </button>
            </form>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE VIEWER */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setFullscreenImage(null)}>
          <button 
            onClick={() => setFullscreenImage(null)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all backdrop-blur-md z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img 
            src={fullscreenImage} 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300 pointer-events-none" 
            alt="Fullscreen View"
          />
        </div>
      )}
    </div>
  );
};

export default Marketplace;
