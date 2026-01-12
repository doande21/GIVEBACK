
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatSession, ChatMessage, DonationItem } from '../types';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  doc,
  orderBy,
  arrayUnion,
  getDoc
} from "firebase/firestore";
import { db } from '../services/firebase';

interface MessagesProps {
  user: User;
}

const Messages: React.FC<MessagesProps> = ({ user }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentItem, setCurrentItem] = useState<DonationItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Lắng nghe danh sách hội thoại
  useEffect(() => {
    const q = query(
      collection(db, "chats"), 
      where("participants", "array-contains", user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession));
      data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setSessions(data);
      setLoading(false);
      
      // Tự động đánh dấu đã đọc nếu đang mở chat
      if (selectedSession) {
        const currentInList = data.find(s => s.id === selectedSession.id);
        if (currentInList && (!currentInList.readBy || !currentInList.readBy.includes(user.id))) {
          updateDoc(doc(db, "chats", currentInList.id), {
            readBy: arrayUnion(user.id)
          });
        }
      }
    });

    return () => unsubscribe();
  }, [user.id, selectedSession?.id]);

  // 2. Lắng nghe tin nhắn và thông tin món đồ của phiên chat đang chọn
  useEffect(() => {
    if (selectedSession) {
      const q = query(collection(db, "chats", selectedSession.id, "messages"), orderBy("createdAt", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      });

      updateDoc(doc(db, "chats", selectedSession.id), {
        readBy: arrayUnion(user.id)
      });

      const fetchItem = async () => {
        const itemDoc = await getDoc(doc(db, "items", selectedSession.itemId));
        if (itemDoc.exists()) {
          setCurrentItem({ id: itemDoc.id, ...itemDoc.data() } as DonationItem);
        }
      };
      fetchItem();

      return unsubscribe;
    }
  }, [selectedSession?.id, user.id]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSession) return;

    const chatMsg: ChatMessage = {
      senderId: user.id,
      senderName: user.name,
      text: newMessage.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "chats", selectedSession.id, "messages"), chatMsg);
      await updateDoc(doc(db, "chats", selectedSession.id), {
        lastMessage: newMessage.trim(),
        lastSenderId: user.id,
        updatedAt: new Date().toISOString(),
        readBy: [user.id]
      });
      setNewMessage('');
    } catch (err) {
      console.error("Lỗi gửi tin:", err);
    }
  };

  const handleConfirmGift = async () => {
    if (!selectedSession || !currentItem || isProcessing) return;
    
    // Kiểm tra bảo mật cuối cùng: Chỉ chủ nhân món đồ mới được bấm
    if (user.id !== currentItem.authorId) {
      alert("Đệ ơi, món đồ này không phải của đệ nên đệ không thể xác nhận tặng được nha!");
      return;
    }

    if (window.confirm(`Đệ có chắc chắn muốn chốt tặng "${currentItem.title}" cho ${selectedSession.receiverName} không?`)) {
      setIsProcessing(true);
      try {
        // 1. Cập nhật món đồ thành hết hàng
        await updateDoc(doc(db, "items", currentItem.id), {
          quantity: 0
        });

        // 2. Gửi tin nhắn hệ thống
        const systemMsg: ChatMessage = {
          senderId: 'system',
          senderName: 'GIVEBACK',
          text: `🎉 XÁC NHẬN: Chủ nhân món đồ đã đồng ý tặng cho bạn! Hai đệ hãy trao đổi địa chỉ để giao nhận đồ nhé. Chúc mừng! 🎁`,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "chats", selectedSession.id, "messages"), systemMsg);

        // 3. Cập nhật session chat
        await updateDoc(doc(db, "chats", selectedSession.id), {
          lastMessage: "Đã xác nhận tặng đồ! 🎁",
          lastSenderId: 'system',
          updatedAt: new Date().toISOString(),
          readBy: [user.id]
        });

        setCurrentItem(prev => prev ? {...prev, quantity: 0} : null);
        alert("Tuyệt vời! Cảm ơn tấm lòng vàng của đệ!");
      } catch (err) {
        console.error("Lỗi xác nhận tặng:", err);
        alert("Có lỗi xảy ra khi cập nhật hệ thống, đệ thử lại sau nhé!");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Xác định đối tượng đang chat cùng
  const getPartnerName = (session: ChatSession) => {
    return session.donorId === user.id ? session.receiverName : session.donorName;
  };

  // Kiểm tra quyền hiển thị nút tặng đồ
  const canShowConfirmButton = 
    selectedSession && 
    currentItem && 
    currentItem.quantity > 0 && 
    currentItem.authorId === user.id; // Chỉ hiện cho chủ món đồ

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto h-[90vh] flex flex-col font-['Inter']">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter">Hộp thư cá nhân</h1>
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Nơi kết nối tấm lòng</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b bg-gray-50/50">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Danh sách hội thoại</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div></div>
            ) : sessions.map(s => {
              const isUnread = s.lastSenderId !== user.id && (!s.readBy || !s.readBy.includes(user.id));
              return (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedSession(s)}
                  className={`p-5 cursor-pointer transition-all hover:bg-emerald-50/30 ${selectedSession?.id === s.id ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'bg-white'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-xs ${isUnread ? 'font-black text-gray-900' : 'font-bold text-gray-500'} line-clamp-1`}>{s.itemTitle}</p>
                    {isUnread && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                  </div>
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter">{getPartnerName(s)}</p>
                  <p className={`text-[10px] mt-2 truncate italic ${isUnread ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                    {s.lastMessage || 'Bắt đầu kết nối...'}
                  </p>
                </div>
              );
            })}
            {!loading && sessions.length === 0 && (
              <div className="p-12 text-center text-[10px] text-gray-400 font-bold uppercase italic tracking-widest">Đang chờ những lời nhắn đầu tiên</div>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col relative">
          {selectedSession ? (
            <>
              <div className="p-6 border-b flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xl italic shadow-sm">
                    {getPartnerName(selectedSession).charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase italic tracking-tighter">{selectedSession.itemTitle}</h3>
                    <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Hội thoại với: {getPartnerName(selectedSession)}</p>
                  </div>
                </div>

                {/* Nút xác nhận - CHỈ CHỦ MÓN ĐỒ MỚI THẤY */}
                {canShowConfirmButton && (
                  <button 
                    onClick={handleConfirmGift}
                    disabled={isProcessing}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-emerald-100 animate-bounce active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? 'Đang cập nhật...' : 'Xác nhận tặng cho đệ này 🎁'}
                  </button>
                )}

                {currentItem && currentItem.quantity <= 0 && (
                   <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Đã hoàn thành trao tặng</span>
                   </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/30">
                {messages.map((m, i) => {
                  const isMe = m.senderId === user.id;
                  const isSystem = m.senderId === 'system';
                  
                  return (
                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : isSystem ? 'items-center' : 'items-start'}`}>
                      {!isSystem && (
                        <span className="text-[8px] font-black text-gray-400 uppercase mb-1.5 px-3 tracking-widest">
                          {isMe ? 'Bạn' : m.senderName}
                        </span>
                      )}
                      <div className={`max-w-[80%] px-5 py-3.5 rounded-3xl text-sm shadow-sm transition-all hover:shadow-md ${
                        isMe 
                          ? 'bg-emerald-600 text-white rounded-tr-none' 
                          : isSystem
                            ? 'bg-amber-100 text-amber-900 border border-amber-200 font-black italic text-center text-xs w-full'
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                      }`}>
                        {m.text}
                        <p className={`text-[8px] mt-1.5 opacity-50 ${isMe ? 'text-white text-right' : 'text-gray-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef}></div>
              </div>

              <form onSubmit={handleSendMessage} className="p-6 bg-white border-t flex space-x-3 items-center">
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  placeholder="Nhập nội dung trao đổi địa chỉ nhận đồ..." 
                  className="flex-1 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl px-6 py-4 outline-none font-bold text-gray-700 transition-all" 
                />
                <button type="submit" className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl shadow-emerald-100 hover:scale-105 active:scale-95 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-20 text-gray-300">
               <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
               </div>
               <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Mời đệ chọn một cuộc trò chuyện</h3>
               <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Yêu thương lan tỏa từ những lời chào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
