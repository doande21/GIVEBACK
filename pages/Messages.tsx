
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatSession, ChatMessage } from '../types';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  doc,
  orderBy,
  getDocs,
  setDoc,
  getDoc,
  runTransaction,
  arrayUnion
} from "firebase/firestore";
import { db } from '../services/firebase';

interface MessagesProps {
  user: User;
  onViewProfile: (userId: string) => void;
}

const Messages: React.FC<MessagesProps> = ({ user, onViewProfile }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConfirmingGift, setIsConfirmingGift] = useState(false);
  
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      // Mark as read when opening a session
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
    }
  }, [selectedSession?.id]);

  useEffect(() => {
    if (chatEndRef.current) { chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }
  }, [messages]);

  const handleConfirmGift = async () => {
    if (!selectedSession || !selectedSession.itemId || isConfirmingGift) return;
    if (!window.confirm(`Đệ có chắc chắn muốn trao tặng món đồ "${selectedSession.itemTitle}" cho ${selectedSession.receiverName} không?`)) return;
    
    setIsConfirmingGift(true);
    try {
      const itemRef = doc(db, "items", selectedSession.itemId);
      const chatRef = doc(db, "chats", selectedSession.id);
      
      await runTransaction(db, async (transaction) => {
        const itemSnap = await transaction.get(itemRef);
        if (!itemSnap.exists()) throw "Món đồ không còn tồn tại!";
        const itemData = itemSnap.data();
        if (itemData.quantity <= 0) throw "Món đồ này đã hết số lượng tặng!";

        transaction.update(itemRef, { quantity: itemData.quantity - 1 });
        transaction.update(chatRef, { 
          giftStatus: 'completed',
          lastMessage: `Người tặng đã xác nhận trao gửi món quà!`,
          updatedAt: new Date().toISOString()
        });

        const claimRef = doc(collection(db, "claims"));
        transaction.set(claimRef, {
          id: claimRef.id,
          itemId: selectedSession.itemId,
          itemTitle: selectedSession.itemTitle,
          itemImage: selectedSession.itemImage || '',
          donorId: selectedSession.donorId,
          donorName: selectedSession.donorName,
          receiverId: selectedSession.receiverId,
          receiverName: selectedSession.receiverName,
          createdAt: new Date().toISOString()
        });

        const msgRef = doc(collection(db, "chats", selectedSession.id, "messages"));
        transaction.set(msgRef, {
          senderId: 'system',
          senderName: 'GIVEBACK',
          text: `🎉 CHÚC MỪNG! Người tặng đã chính thức trao gửi món đồ này cho đệ.`,
          createdAt: new Date().toISOString()
        });
      });
    } catch (e: any) { alert("Lỗi: " + String(e)); } 
    finally { setIsConfirmingGift(false); }
  };

  const handleFetchFriends = async () => {
    if (!user.friends?.length) { setFriendsList([]); return; }
    try {
      const q = query(collection(db, "users"), where("id", "in", user.friends.slice(0, 10)));
      const snap = await getDocs(q);
      setFriendsList(snap.docs.map(d => d.data() as User));
    } catch (e) { console.error(e); }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedFriends.length === 0) return;
    const groupId = `group_${Date.now()}`;
    const participants = [user.id, ...selectedFriends];
    const newGroup: any = {
      id: groupId,
      type: 'group',
      groupName: groupName.trim(),
      groupAdminId: user.id,
      participants: participants,
      lastMessage: `Nhóm "${groupName}" đã sẵn sàng kết nối!`,
      lastSenderId: 'system',
      updatedAt: new Date().toISOString(),
      readBy: [user.id]
    };
    try {
      await setDoc(doc(db, "chats", groupId), newGroup);
      await addDoc(collection(db, "chats", groupId, "messages"), {
        senderId: 'system',
        senderName: 'GIVEBACK',
        text: `Chào mừng các đồng đội đến với nhóm "${groupName}"! 🎉`,
        createdAt: new Date().toISOString()
      });
      setIsGroupModalOpen(false);
      setGroupName('');
      setSelectedFriends([]);
      setSelectedSession(newGroup as ChatSession);
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSession) return;
    const chatMsg: ChatMessage = {
      senderId: user.id,
      senderName: user.name,
      senderIsGuest: user.isGuest,
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
    } catch (err) { console.error(err); }
  };

  const getPartnerName = (session: ChatSession) => {
    if (session.type === 'group') return session.groupName || 'Nhóm chat';
    return session.donorId === user.id ? session.receiverName : session.donorName;
  };

  const getPartnerId = (session: ChatSession) => {
    if (session.type === 'group') return null;
    return session.donorId === user.id ? session.receiverId : session.donorId;
  };

  const isPartnerGuest = (session: ChatSession) => {
    if (session.type === 'group') return false;
    return session.donorId === user.id ? session.receiverIsGuest : session.donorIsGuest;
  };

  const handlePartnerProfileClick = (session: ChatSession) => {
    const partnerId = getPartnerId(session);
    if (partnerId) onViewProfile(partnerId);
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto h-[90vh] flex flex-col font-['Plus_Jakarta_Sans']">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter leading-none">Hộp thư</h1>
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Sẻ chia là hạnh phúc</p>
        </div>
        <button onClick={() => { setIsGroupModalOpen(true); handleFetchFriends(); }} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:scale-105 active:scale-95 transition-all">
          Lập nhóm chat +
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b bg-gray-50/50 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hội thoại yêu thương</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div></div>
            ) : sessions.map(s => {
              const isUnread = s.lastSenderId !== user.id && (!s.readBy || !s.readBy.includes(user.id));
              const isCompleted = s.giftStatus === 'completed';
              const partnerIsGuest = s.donorId === user.id ? s.receiverIsGuest : s.donorIsGuest;
              return (
                <div key={s.id} onClick={() => setSelectedSession(s)} className={`p-5 cursor-pointer transition-all hover:bg-emerald-50/30 ${selectedSession?.id === s.id ? 'bg-emerald-50 border-l-4 border-emerald-600 shadow-inner' : 'bg-white'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <p className={`text-xs ${isUnread ? 'font-black text-emerald-900' : 'font-bold text-gray-600'} line-clamp-1 italic uppercase`}>
                        {getPartnerName(s)}
                      </p>
                      {partnerIsGuest && <span className="text-[7px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-black uppercase">Guest</span>}
                    </div>
                    {isCompleted && <span className="text-[7px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase">Đã trao</span>}
                  </div>
                  <p className={`text-[10px] mt-2 truncate italic ${isUnread ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                    {s.lastMessage || 'Chưa có lời nhắn nào...'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
          {selectedSession ? (
            <>
              <div className="p-6 border-b flex flex-col bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div 
                      onClick={() => handlePartnerProfileClick(selectedSession)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl italic shadow-inner cursor-pointer hover:scale-105 transition-transform ${selectedSession.type === 'group' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}
                    >
                      {getPartnerName(selectedSession).charAt(0)}
                    </div>
                    <div onClick={() => handlePartnerProfileClick(selectedSession)} className="cursor-pointer group/name">
                      <h3 className="text-sm font-black text-gray-900 uppercase italic tracking-tighter group-hover/name:text-emerald-600 transition-colors">{getPartnerName(selectedSession)}</h3>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{selectedSession.type === 'group' ? 'Nhóm thiện nguyện' : 'Đồng đội GIVEBACK'}</p>
                    </div>
                  </div>
                  {selectedSession.itemId && selectedSession.donorId === user.id && selectedSession.giftStatus !== 'completed' && (
                    <button onClick={handleConfirmGift} disabled={isConfirmingGift} className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl animate-bounce hover:animate-none">
                      Xác nhận tặng quà 🎁
                    </button>
                  )}
                </div>

                {isPartnerGuest(selectedSession) && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3 animate-in fade-in duration-500">
                    <span className="text-xl">⚠️</span>
                    <p className="text-[10px] font-black text-amber-800 uppercase italic leading-tight">
                      Chú ý: Đệ đang nhắn tin với tài khoản dùng thử. Hãy cẩn trọng khi chia sẻ thông tin cá nhân hoặc thực hiện giao dịch nhé!
                    </p>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/20">
                {messages.map((m, i) => {
                  const isMe = m.senderId === user.id;
                  const isSystem = m.senderId === 'system';
                  return (
                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : isSystem ? 'items-center' : 'items-start'}`}>
                      {!isSystem && (
                        <div className="flex items-center gap-2 mb-1.5 px-3">
                          <span onClick={() => !isMe && onViewProfile(m.senderId)} className={`text-[9px] font-black text-gray-400 uppercase italic ${!isMe ? 'cursor-pointer hover:text-emerald-600' : ''}`}>{isMe ? 'Đệ' : m.senderName}</span>
                          {m.senderIsGuest && <span className="text-[7px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-black uppercase">Guest</span>}
                        </div>
                      )}
                      <div className={`max-w-[75%] px-5 py-3.5 rounded-[2rem] text-sm shadow-sm ${
                        isMe ? 'bg-emerald-600 text-white rounded-tr-none' : isSystem ? 'bg-amber-50 text-amber-900 font-black italic text-[11px] border border-amber-100' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef}></div>
              </div>

              <form onSubmit={handleSendMessage} className="p-6 bg-white border-t flex space-x-3 items-center">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Nhắn nhủ điều gì chân thành..." className="flex-1 bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 rounded-2xl px-6 py-4 outline-none font-bold text-gray-700 shadow-inner" />
                <button type="submit" className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-20 text-gray-200">
               <span className="text-6xl mb-6">💌</span>
               <h3 className="text-xl font-black text-gray-300 uppercase italic tracking-tighter">Chọn một người bạn để bắt đầu sẻ chia</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
