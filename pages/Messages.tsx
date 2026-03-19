
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatSession, ChatMessage, DonationItem } from '../types';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc,
  orderBy,
  arrayUnion,
  deleteDoc,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { db } from '../services/firebase';

interface MessagesProps {
  user: User;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
  onConfirm?: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info') => void;
}

const STICKERS = [
  '😊', '😂', '🥰', '😍', '😒', '😭', '😱', '😴', '🥳', '😎',
  '👍', '👎', '❤️', '🔥', '✨', '🎉', '🎁', '🙏', '🤝', '💪'
];

const Messages: React.FC<MessagesProps> = ({ user, onNotify, onConfirm }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
      chatData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setChats(chatData);
    });

    return () => unsubscribe();
  }, [user.id]);

  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(messageData);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [activeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    e?.preventDefault();
    const text = textOverride || newMessage;
    if (!activeChat || !text.trim()) return;

    try {
      const messageText = text.trim();
      setNewMessage('');
      setShowStickers(false);

      await addDoc(collection(db, "chats", activeChat.id, "messages"), {
        senderId: user.id,
        senderName: user.name,
        text: messageText,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessage: messageText,
        lastSenderId: user.id,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      onNotify('error', "Không thể gửi tin nhắn.");
    }
  };

  const handleConfirmGift = async () => {
    if (!activeChat || !activeChat.itemId) return;

    const performConfirm = async () => {
      try {
        const itemRef = doc(db, "items", activeChat.itemId!);
        const itemSnap = await getDoc(itemRef);
        
        if (!itemSnap.exists()) {
          onNotify('error', "Món đồ không còn tồn tại.");
          return;
        }

        const itemData = itemSnap.data() as DonationItem;
        const currentQuantity = itemData.quantity || 0;

        if (currentQuantity <= 0) {
          onNotify('warning', "Món đồ này đã hết hàng!");
          return;
        }

        // 1. Update chat status
        await updateDoc(doc(db, "chats", activeChat.id), {
          giftStatus: 'completed',
          updatedAt: new Date().toISOString()
        });

        // 2. Cập nhật trạng thái món đồ
        if (selectedSession.itemId) {
          await updateDoc(doc(db, "items", selectedSession.itemId), {
            status: 'donated',
            updatedAt: new Date().toISOString()
          });
        }

        // 3. Create claim record
        await addDoc(collection(db, "claims"), {
          itemId: activeChat.itemId,
          itemTitle: activeChat.itemTitle,
          itemImage: activeChat.itemImage,
          donorId: activeChat.donorId,
          donorName: activeChat.donorName,
          receiverId: activeChat.receiverId,
          receiverName: activeChat.receiverName,
          claimedAt: new Date().toISOString()
        });

        // 4. Send system message
        await addDoc(collection(db, "chats", activeChat.id, "messages"), {
          senderId: 'system',
          senderName: 'Hệ thống',
          text: `🎁 Chúc mừng! Món quà "${activeChat.itemTitle}" đã được xác nhận tặng thành công.`,
          createdAt: new Date().toISOString()
        });

        onNotify('success', "Đã xác nhận tặng quà thành công!");
      } catch (err) {
        console.error("Confirm Gift Error:", err);
        onNotify('error', "Có lỗi xảy ra khi xác nhận.");
      }
    };

    if (onConfirm) {
      onConfirm(
        "Xác nhận tặng quà",
        `Bạn có chắc chắn muốn tặng "${activeChat.itemTitle}" cho ${activeChat.receiverName} không?`,
        performConfirm,
        'info'
      );
    } else {
      performConfirm();
    }
  };

  return (
    <div className="pt-20 h-screen flex bg-[#0d1117] font-['Inter'] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 md:w-96 border-r border-gray-800 flex flex-col bg-[#111b21]">
        {/* Sidebar Header */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Chats</h2>
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-gray-400 hover:bg-gray-800 rounded-full transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <button className="p-2 text-gray-400 hover:bg-gray-800 rounded-full transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
              type="text" 
              placeholder="Tìm kiếm" 
              className="w-full bg-[#202c33] border-none rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all text-white placeholder:text-gray-500"
            />
          </div>

          {/* Stories / Quick Contacts */}
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <button className="w-12 h-12 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </button>
              <span className="text-[10px] text-gray-500 font-medium">Ghi chú</span>
            </div>
            {['Thanh Ph...', 'Người dù...', 'Admin', 'Hệ thống'].map((name, i) => (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-emerald-500/20 p-0.5">
                  <div className="w-full h-full rounded-full bg-emerald-900/20 flex items-center justify-center text-emerald-500 text-xs font-bold">
                    {name.charAt(0)}
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 font-medium truncate w-full text-center">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {chats.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Chưa có tin nhắn</p>
            </div>
          ) : (
            chats.map(chat => {
              const otherParticipant = chat.donorId === user.id ? chat.receiverName : chat.donorName;
              const isActive = activeChat?.id === chat.id;
              return (
                <div 
                  key={chat.id} 
                  onClick={() => setActiveChat(chat)}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xl">
                      {otherParticipant.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111b21] rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-[15px] font-bold text-white truncate">{otherParticipant}</h4>
                      <span className="text-[11px] text-gray-500">{new Date(chat.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[13px] text-gray-400 truncate pr-2">{chat.lastMessage}</p>
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Bottom Nav */}
        <div className="p-2 border-t border-gray-800 flex justify-around bg-[#111b21]">
          <button className="flex flex-col items-center gap-1 p-2 text-emerald-500">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.47 0-2.84-.39-4.03-1.06l-.29-.17-3.01.88.89-2.93-.18-.3C4.39 15.23 4 13.67 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
            <span className="text-[10px] font-bold">Đoạn chat</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-gray-500 hover:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span className="text-[10px] font-bold">Mọi người</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-gray-500 hover:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            <span className="text-[10px] font-bold">Kho lưu trữ</span>
          </button>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-[#0d1117] relative">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-2 border-b border-gray-800 bg-[#111b21] flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button className="md:hidden text-emerald-500 p-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    {(activeChat.donorId === user.id ? activeChat.receiverName : activeChat.donorName).charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#111b21] rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white leading-tight">{activeChat.donorId === user.id ? activeChat.receiverName : activeChat.donorName}</h3>
                  <p className="text-[11px] text-gray-400">Đang hoạt động</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-emerald-500">
                <button className="p-2 hover:bg-gray-800 rounded-full transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                </button>
                <button className="p-2 hover:bg-gray-800 rounded-full transition-all">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                </button>
                <button className="p-2 hover:bg-gray-800 rounded-full transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[#0d1117]">
              <div className="flex justify-center my-6">
                <span className="bg-gray-800/50 text-gray-500 text-[11px] font-bold px-3 py-1 rounded-md uppercase tracking-widest">Hôm nay</span>
              </div>

              {activeChat.itemId && (
                <div className="flex justify-center mb-6">
                  <div className="bg-[#161b22] border border-gray-800 p-3 rounded-2xl flex items-center gap-4 max-w-sm w-full shadow-xl">
                    <img src={activeChat.itemImage} className="w-16 h-16 rounded-xl object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase text-emerald-500 mb-1">Đang trao đổi món quà</p>
                      <p className="text-sm font-bold text-gray-200 truncate mb-2">{activeChat.itemTitle}</p>
                      {activeChat.donorId === user.id && activeChat.giftStatus !== 'completed' ? (
                        <button 
                          onClick={handleConfirmGift}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-[11px] font-bold uppercase transition-all"
                        >
                          Xác nhận tặng quà 🎁
                        </button>
                      ) : (
                        <div className="text-center py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-[11px] font-bold uppercase">
                          {activeChat.giftStatus === 'completed' ? 'Đã hoàn tất tặng' : 'Đang chờ xác nhận'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user.id;
                const isSystem = msg.senderId === 'system';
                
                if (isSystem) {
                  return (
                    <div key={msg.id || idx} className="flex justify-center my-4">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-md ${isMe ? 'bg-emerald-600 text-white' : 'bg-[#202c33] text-gray-200'}`}>
                      {msg.text}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[10px] text-gray-600 font-medium">
                        {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      {isMe && idx === messages.length - 1 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-gray-600 font-bold">Đã xem</span>
                          <div className="w-3 h-3 rounded-full bg-gray-700 overflow-hidden">
                            <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-[6px] text-white font-bold">
                              {(activeChat.donorId === user.id ? activeChat.receiverName : activeChat.donorName).charAt(0)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#111b21]">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex gap-1">
                  <button type="button" className="p-2 text-emerald-500 hover:bg-gray-800 rounded-full transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <button type="button" className="p-2 text-emerald-500 hover:bg-gray-800 rounded-full transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                  <button type="button" className="p-2 text-emerald-500 hover:bg-gray-800 rounded-full transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                </div>
                
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Aa"
                    className="w-full bg-[#2a3942] border-none rounded-full px-5 py-2.5 text-[15px] outline-none text-white placeholder:text-gray-500"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowStickers(!showStickers)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-400"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                </div>

                <button 
                  type="submit"
                  className="text-emerald-500 p-2 hover:bg-gray-800 rounded-full transition-all active:scale-90"
                >
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              </form>

              {showStickers && (
                <div className="absolute bottom-20 left-4 right-4 bg-[#111b21] border border-gray-800 rounded-3xl p-4 shadow-2xl z-20 animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {STICKERS.map(sticker => (
                      <button 
                        key={sticker}
                        onClick={() => handleSendMessage(undefined, sticker)}
                        className="text-2xl hover:bg-gray-800 p-2 rounded-xl transition-all hover:scale-110"
                      >
                        {sticker}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-[#0d1117]">
            <div className="w-24 h-24 bg-emerald-900/20 rounded-[2rem] flex items-center justify-center mb-6 border border-emerald-500/20">
              <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h3 className="text-xl font-black uppercase tracking-widest text-white mb-2">Chọn một cuộc hội thoại</h3>
            <p className="text-gray-500 text-sm max-w-xs font-medium leading-relaxed">Kết nối với những người bạn mới để trao đổi những món quà ý nghĩa từ GIVEBACK.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
