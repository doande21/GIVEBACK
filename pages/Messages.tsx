
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatSession, ChatMessage, PostMedia } from '../types';
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
  deleteDoc,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { db } from '../services/firebase';

interface MessagesProps {
  user: User;
  onViewProfile: (userId: string) => void;
}

// Hàm nén ảnh tiết kiệm dung lượng
const compressImage = (base64Str: string, maxWidth = 500, quality = 0.5): Promise<string> => {
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

const STICKERS = ["❤️", "🎁", "🙏", "🚚", "✨", "😊", "💪", "🌈", "🔥", "🤝", "👍", "🌸"];

const Messages: React.FC<MessagesProps> = ({ user, onViewProfile }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
      if (showStickers && !(event.target as Element).closest('.sticker-container')) {
        setShowStickers(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showStickers]);

  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, "chats"), where("participants", "array-contains", user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession));
      data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setSessions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.id]);

  useEffect(() => {
    if (selectedSession) {
      const isUnread = selectedSession.lastSenderId !== user.id && (!selectedSession.readBy || !selectedSession.readBy.includes(user.id));
      if (isUnread) {
        updateDoc(doc(db, "chats", selectedSession.id), {
          readBy: arrayUnion(user.id)
        });
      }

      const q = query(collection(db, "chats", selectedSession.id, "messages"), orderBy("createdAt", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      });
      return unsubscribe;
    } else {
      setMessages([]);
    }
  }, [selectedSession?.id, user.id]);

  useEffect(() => {
    if (chatEndRef.current) { 
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); 
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, media?: PostMedia[]) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !media && !isUploading) return;
    if (!selectedSession) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setShowStickers(false);

    try {
      await addDoc(collection(db, "chats", selectedSession.id, "messages"), {
        senderId: user.id,
        senderName: user.name,
        senderIsGuest: user.isGuest || false,
        text: messageText,
        media: media || [],
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, "chats", selectedSession.id), {
        lastMessage: media ? (media[0].type === 'image' ? '📸 Hình ảnh' : '🎥 Video') : messageText,
        lastSenderId: user.id,
        updatedAt: new Date().toISOString(),
        readBy: [user.id]
      });
    } catch (err) { 
      console.error("Lỗi gửi tin nhắn:", err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedSession) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        let finalData = reader.result as string;
        const isVideo = file.type.startsWith('video/');
        if (!isVideo) finalData = await compressImage(finalData);
        
        await handleSendMessage(undefined, [{ url: finalData, type: isVideo ? 'video' : 'image' }]);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendSticker = (sticker: string) => {
    setNewMessage(sticker);
    // Tự động gửi luôn khi chọn sticker
    setTimeout(() => {
        handleSendMessage();
    }, 100);
  };

  const handleDeleteChat = async (sessionId: string) => {
    if (!sessionId) return;
    if (window.confirm("Huynh đệ có chắc chắn muốn xóa toàn bộ đoạn chat này không?")) {
      try {
        const msgsQuery = query(collection(db, "chats", sessionId, "messages"));
        const msgsSnap = await getDocs(msgsQuery);
        const batch = writeBatch(db);
        msgsSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        await deleteDoc(doc(db, "chats", sessionId));
        if (selectedSession?.id === sessionId) setSelectedSession(null);
        setActiveMenuId(null);
      } catch (err) {
        console.error("Lỗi xóa hội thoại:", err);
      }
    }
  };

  const getPartnerName = (session: ChatSession) => {
    if (session.type === 'group') return session.groupName || 'Nhóm chat';
    return session.donorId === user.id ? session.receiverName : session.donorName;
  };

  const getPartnerId = (session: ChatSession) => {
    return session.donorId === user.id ? session.receiverId : session.donorId;
  };

  return (
    <div className="pt-20 pb-4 px-2 md:px-4 max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col transition-colors">
      <div className="flex-1 flex gap-4 overflow-hidden">
        
        {/* SIDEBAR */}
        <div className={`lg:flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 overflow-hidden ${selectedSession ? 'hidden' : 'flex'} lg:w-[400px] p-6 shadow-sm`}>
          <div className="mb-8 flex justify-between items-center">
             <h1 className="text-3xl font-black text-Klavika-950 dark:text-Klavika-400 uppercase  tracking-tighter">Tâm sự</h1>
             <button className="p-2 bg-Klavika-100 dark:bg-Klavika-900 text-Klavika-600 rounded-full">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
             </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {sessions.map(s => {
              const isUnread = s.lastSenderId !== user.id && (!s.readBy || !s.readBy.includes(user.id));
              const isSelected = selectedSession?.id === s.id;
              return (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedSession(s)} 
                  className={`p-4 rounded-3xl cursor-pointer transition-all border-2 flex items-center space-x-3 ${isSelected ? 'bg-Klavika-600 border-Klavika-500 text-white' : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-900 dark:text-white'}`}
                >
                   <div className="w-12 h-12 rounded-2xl bg-Klavika-500 text-white flex items-center justify-center font-black">
                     {getPartnerName(s).charAt(0)}
                   </div>
                   <div className="flex-1 min-w-0">
                      <h4 className={`text-sm truncate uppercase font-black ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{getPartnerName(s)}</h4>
                      <p className={`text-[10px] truncate ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>{s.lastMessage || '...'}</p>
                   </div>
                   {isUnread && !isSelected && <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-[3rem] border border-gray-100 dark:border-slate-800 overflow-hidden shadow-2xl relative ${!selectedSession ? 'hidden lg:flex' : 'flex'}`}>
          {selectedSession ? (
            <React.Fragment>
              {/* HEADER */}
              <div className="px-6 py-4 border-b dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button onClick={() => setSelectedSession(null)} className="lg:hidden text-Klavika-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
                  <div className="w-10 h-10 rounded-xl bg-Klavika-500 text-white flex items-center justify-center font-black">{getPartnerName(selectedSession).charAt(0)}</div>
                  <h3 className="font-black dark:text-white uppercase text-sm ">{getPartnerName(selectedSession)}</h3>
                </div>
                <div className="relative">
                  <button onClick={() => setActiveMenuId('header')} className="text-gray-400 hover:text-Klavika-500 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M5 12c0 1.104.896 2 2 2s2-.896 2-2-.896-2-2-2-2 .896-2 2zm14 0c0 1.104.896 2 2 2s2-.896 2-2-.896-2-2-2-2 .896-2 2zm-7 0c0 1.104.896 2 2 2s2-.896 2-2-.896-2-2-2-2 .896-2 2z"/></svg>
                  </button>
                  {activeMenuId === 'header' && (
                    <div ref={menuRef} className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border dark:border-slate-700 z-50 py-2">
                      <button onClick={() => { onViewProfile(getPartnerId(selectedSession)); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-xs font-bold uppercase">Hồ sơ</button>
                      <button onClick={() => handleDeleteChat(selectedSession.id)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-xs font-bold uppercase">Xóa chat</button>
                    </div>
                  )}
                </div>
              </div>

              {/* MESSAGES */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-slate-950/20 custom-scrollbar">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] flex flex-col ${m.senderId === user.id ? 'items-end' : 'items-start'}`}>
                      {m.text && (
                        <div className={`px-5 py-3 rounded-[2rem] text-sm font-bold shadow-sm mb-1 ${m.senderId === user.id ? 'bg-Klavika-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-tl-none border dark:border-slate-700'}`}>
                          {m.text}
                        </div>
                      )}
                      {m.media && m.media.length > 0 && (
                        <div className="mt-1">
                          {m.media[0].type === 'video' ? (
                            <video src={m.media[0].url} controls className="max-w-[250px] rounded-2xl shadow-lg border-2 border-white" />
                          ) : (
                            <img src={m.media[0].url} className="max-w-[250px] rounded-2xl shadow-lg border-2 border-white" alt="Chat Media" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isUploading && (
                   <div className="flex justify-end animate-pulse">
                      <div className="bg-Klavika-100 px-4 py-2 rounded-2xl text-[10px] font-black uppercase text-Klavika-600 ">Đang tải ảnh...</div>
                   </div>
                )}
                <div ref={chatEndRef}></div>
              </div>

              {/* STICKER PICKER */}
              {showStickers && (
                <div className="sticker-container absolute bottom-24 left-6 right-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-[2rem] shadow-2xl border border-Klavika-50 dark:border-slate-700 z-[100] animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-6 gap-3">
                    {STICKERS.map((s, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => handleSendSticker(s)}
                        className="text-2xl p-2 hover:bg-Klavika-50 dark:hover:bg-Klavika-900/50 rounded-xl transition-all active:scale-90"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* INPUT BAR */}
              <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                   <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    accept="image/*,video/*" 
                    onChange={handleFileChange}
                   />
                   <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-Klavika-600 p-2 hover:bg-Klavika-50 rounded-full transition-all"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                   </button>
                   <div className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full px-6 py-2 flex items-center">
                      <input 
                        type="text" 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Aa" 
                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold dark:text-white py-2"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowStickers(!showStickers)}
                        className={`transition-colors ${showStickers ? 'text-Klavika-600' : 'text-Klavika-500'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" /></svg>
                      </button>
                   </div>
                   <button 
                    type="submit" 
                    disabled={!newMessage.trim() && !isUploading} 
                    className={`p-3 rounded-full transition-all ${newMessage.trim() ? 'text-Klavika-600 scale-110 send-active' : 'text-gray-300'}`}
                   >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-45" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                   </button>
                </form>
              </div>
            </React.Fragment>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
               <div className="w-32 h-32 bg-Klavika-50 dark:bg-Klavika-900/20 rounded-full flex items-center justify-center mb-8 border-4 border-white dark:border-slate-800">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-Klavika-600/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
               </div>
               <h3 className="text-xl font-black text-gray-400 dark:text-Klavika-400/20 uppercase tracking-widest ">Chọn một người để trò chuyện</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
