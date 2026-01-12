
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
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (selectedSession) {
      const q = query(collection(db, "chats", selectedSession.id, "messages"), orderBy("createdAt", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      });

      updateDoc(doc(db, "chats", selectedSession.id), {
        readBy: arrayUnion(user.id)
      });

      // Lấy thông tin món đồ để kiểm tra trạng thái còn hay hết
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
    if (!selectedSession || !currentItem) return;
    if (window.confirm(`Đệ có chắc chắn muốn tặng "${currentItem.title}" cho ${selectedSession.receiverName} không?`)) {
      try {
        // 1. Cập nhật món đồ thành hết hàng (quantity = 0)
        await updateDoc(doc(db, "items", currentItem.id), {
          quantity: 0
        });

        // 2. Gửi tin nhắn hệ thống tự động
        const systemMsg: ChatMessage = {
          senderId: 'system',
          senderName: 'GIVEBACK',
          text: `🎉 CHÚC MỪNG! Người tặng đã xác nhận tặng món đồ này cho bạn. Hãy trao đổi địa chỉ và cách thức nhận đồ nhé!`,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "chats", selectedSession.id, "messages"), systemMsg);

        // 3. Cập nhật session chat
        await updateDoc(doc(db, "chats", selectedSession.id), {
          lastMessage: "Đã xác nhận tặng món đồ này! 🎁",
          lastSenderId: 'system',
          updatedAt: new Date().toISOString(),
          readBy: [user.id]
        });

        // Cập nhật state local
        setCurrentItem(prev => prev ? {...prev, quantity: 0} : null);
        alert("Tuyệt vời! Đệ vừa lan tỏa thêm một niềm vui mới. Cảm ơn tấm lòng của đệ!");
      } catch (err) {
        console.error("Lỗi xác nhận tặng:", err);
        alert("Có lỗi xảy ra, đệ thử lại sau nhé!");
      }
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto h-[90vh] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter">Hộp thư cá nhân</h1>
        <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mt-1">Nơi kết nối tấm lòng</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b bg-gray-50/50">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cuộc hội thoại</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {loading ? (
              <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div></div>
            ) : sessions.map(s => {
              const partnerName = s.donorId === user.id ? s.receiverName : s.donorName;
              const isUnread = s.lastSenderId !== user.id && (!s.readBy || !s.readBy.includes(user.id));
              
              return (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedSession(s)}
                  className={`p-4 cursor-pointer transition-all hover:bg-emerald-50/30 ${selectedSession?.id === s.id ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-xs ${isUnread ? 'font-black text-emerald-900' : 'font-bold text-gray-700'} line-clamp-1`}>{s.itemTitle}</p>
                    {isUnread && (
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white shadow-sm"></span>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">{partnerName}</p>
                  <p className={`text-[10px] mt-2 truncate italic ${isUnread ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                    "{s.lastMessage || 'Bắt đầu trò chuyện...'}"
                  </p>
                </div>
              );
            })}
            {!loading && sessions.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-400 italic">Bạn chưa có tin nhắn nào.</div>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col relative">
          {selectedSession ? (
            <>
              <div className="p-6 border-b flex items-center justify-between bg-emerald-50/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black">
                    {(selectedSession.donorId === user.id ? selectedSession.receiverName : selectedSession.donorName).charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase italic">{selectedSession.itemTitle}</h3>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                      Đang chat với: {selectedSession.donorId === user.id ? selectedSession.receiverName : selectedSession.donorName}
                    </p>
                  </div>
                </div>

                {/* Nút xác nhận tặng đồ - Chỉ hiển thị cho người tặng và món đồ còn hàng */}
                {user.id === selectedSession.donorId && currentItem && currentItem.quantity > 0 && (
                  <button 
                    onClick={handleConfirmGift}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg animate-bounce"
                  >
                    Xác nhận tặng cho bạn này 🎁
                  </button>
                )}

                {currentItem && currentItem.quantity <= 0 && (
                   <span className="bg-gray-100 text-gray-400 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border">
                     Đã hoàn thành tặng đồ
                   </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20">
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.senderId === user.id ? 'items-end' : m.senderId === 'system' ? 'items-center' : 'items-start'}`}>
                    {m.senderId !== 'system' && (
                      <span className="text-[8px] font-black text-gray-400 uppercase mb-1 px-2">{m.senderName}</span>
                    )}
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      m.senderId === user.id 
                        ? 'bg-emerald-600 text-white rounded-tr-none' 
                        : m.senderId === 'system'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200 font-bold italic text-center text-xs'
                          : 'bg-white text-gray-700 border border-emerald-50 rounded-tl-none'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef}></div>
              </div>

              <form onSubmit={handleSendMessage} className="p-6 bg-white border-t flex space-x-3">
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  placeholder="Nhập nội dung trao đổi..." 
                  className="flex-1 bg-gray-100 border-none rounded-2xl px-6 py-3 outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                />
                <button type="submit" className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg shadow-emerald-100 hover:scale-105 active:scale-95 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 text-gray-300">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
               <h3 className="text-lg font-black text-gray-900 uppercase italic">Chọn cuộc trò chuyện</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
