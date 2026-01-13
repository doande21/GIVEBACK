
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
  runTransaction
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
      // Fix: Proper typing for sessions data by casting to ChatSession
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession));
      data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setSessions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.id]);

  useEffect(() => {
    if (selectedSession) {
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
    if (!window.confirm(`Đệ có chắc chắn muốn trao tặng món đồ "${selectedSession.itemTitle}" cho ${selectedSession.receiverName} không? Hành động này sẽ trừ số lượng món đồ.`)) return;
    
    setIsConfirmingGift(true);
    try {
      const itemRef = doc(db, "items", selectedSession.itemId);
      const chatRef = doc(db, "chats", selectedSession.id);
      
      await runTransaction(db, async (transaction) => {
        const itemSnap = await transaction.get(itemRef);
        if (!itemSnap.exists()) throw "Món đồ không còn tồn tại!";
        const itemData = itemSnap.data();
        if (itemData.quantity <= 0) throw "Món đồ này đã hết số lượng tặng!";

        // Trừ số lượng món đồ
        transaction.update(itemRef, { quantity: itemData.quantity - 1 });
        
        // Cập nhật trạng thái chat
        transaction.update(chatRef, { 
          giftStatus: 'completed',
          lastMessage: `Người tặng đã xác nhận trao gửi món quà!`,
          updatedAt: new Date().toISOString()
        });

        // Ghi lại lịch sử (Claims)
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

        // Gửi tin nhắn hệ thống vào chat
        const msgRef = doc(collection(db, "chats", selectedSession.id, "messages"));
        transaction.set(msgRef, {
          senderId: 'system',
          senderName: 'GIVEBACK',
          text: `🎉 CHÚC MỪNG! Người tặng đã chính thức trao gửi món đồ này cho đệ. Hãy liên hệ để nhận quà nhé!`,
          createdAt: new Date().toISOString()
        });
      });

      alert("Tuyệt vời! Đệ vừa thực hiện một hành động sẻ chia thật ý nghĩa.");
    } catch (e: any) {
      alert("Lỗi: " + String(e));
    } finally {
      setIsConfirmingGift(false);
    }
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

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto h-[90vh] flex flex-col font-['Inter']">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter leading-none">Hộp thư</h1>
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Sẻ chia là hạnh phúc</p>
        </div>
        <button 
          onClick={() => { setIsGroupModalOpen(true); handleFetchFriends(); }}
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:scale-105 active:scale-95 transition-all"
        >
          Lập nhóm chat +
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b bg-gray-50/50">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hội thoại yêu thương</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div></div>
            ) : sessions.map(s => {
              const isUnread = s.lastSenderId !== user.id && (!s.readBy || !s.readBy.includes(user.id));
              // Fix: Correctly access giftStatus now that ChatSession is properly interfaced
              const isCompleted = s.giftStatus === 'completed';
              return (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedSession(s)}
                  className={`p-5 cursor-pointer transition-all hover:bg-emerald-50/30 ${selectedSession?.id === s.id ? 'bg-emerald-50 border-l-4 border-emerald-600 shadow-inner' : 'bg-white'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-xs ${isUnread ? 'font-black text-emerald-900' : 'font-bold text-gray-600'} line-clamp-1 italic uppercase`}>
                      {s.type === 'group' ? s.groupName : s.itemTitle || 'Trò chuyện riêng'}
                    </p>
                    {isCompleted && <span className="text-[7px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm">Đã trao</span>}
                    {isUnread && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{getPartnerName(s)}</p>
                  <p className={`text-[10px] mt-2 truncate italic ${isUnread ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                    {s.lastMessage || 'Chưa có lời nhắn nào...'}
                  </p>
                </div>
              );
            })}
            {!loading && sessions.length === 0 && (
              <div className="p-12 text-center text-[10px] text-gray-300 font-black uppercase italic tracking-widest">Hộp thư còn trống...</div>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col relative">
          {selectedSession ? (
            <>
              <div className="p-6 border-b flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl italic shadow-inner ${selectedSession.type === 'group' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {getPartnerName(selectedSession).charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-gray-900 uppercase italic tracking-tighter truncate">{getPartnerName(selectedSession)}</h3>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{selectedSession.type === 'group' ? `${selectedSession.participants.length} thành viên` : 'Đồng đội GIVEBACK'}</p>
                  </div>
                </div>
                
                {/* Gift Confirmation Logic */}
                {selectedSession.itemId && selectedSession.donorId === user.id && selectedSession.giftStatus !== 'completed' && (
                  <button 
                    onClick={handleConfirmGift}
                    disabled={isConfirmingGift}
                    className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-amber-100 animate-bounce hover:animate-none hover:bg-amber-600 transition-all"
                  >
                    Xác nhận tặng quà 🎁
                  </button>
                )}
                {selectedSession.giftStatus === 'completed' && (
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Đã trao gửi thành công</span>
                  </div>
                )}
              </div>

              {selectedSession.itemId && (
                <div className="px-6 py-3 bg-gray-50 flex items-center justify-between border-b">
                  <div className="flex items-center gap-3">
                    <img src={selectedSession.itemImage || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded-lg object-cover" alt="" />
                    <p className="text-[10px] font-black text-gray-600 uppercase italic tracking-tighter">Đang trao đổi về: {selectedSession.itemTitle}</p>
                  </div>
                  <p className="text-[8px] text-gray-400 font-bold">Mã: {selectedSession.itemId.slice(-5)}</p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/20">
                {messages.map((m, i) => {
                  const isMe = m.senderId === user.id;
                  const isSystem = m.senderId === 'system';
                  return (
                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : isSystem ? 'items-center' : 'items-start'}`}>
                      {!isSystem && <span className="text-[9px] font-black text-gray-400 uppercase mb-1.5 px-3 italic">{isMe ? 'Đệ' : m.senderName}</span>}
                      <div className={`max-w-[75%] px-5 py-3.5 rounded-[2rem] text-sm shadow-sm transition-all ${
                        isMe ? 'bg-emerald-600 text-white rounded-tr-none' : isSystem ? 'bg-amber-50 text-amber-900 font-black italic text-[11px] border border-amber-100 text-center animate-in zoom-in-90' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef}></div>
              </div>

              <form onSubmit={handleSendMessage} className="p-6 bg-white border-t flex space-x-3 items-center">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Nhắn nhủ điều gì chân thành..." className="flex-1 bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 rounded-2xl px-6 py-4 outline-none font-bold text-gray-700 transition-all shadow-inner" />
                <button type="submit" className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl shadow-emerald-100 hover:scale-105 active:scale-95 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-20 text-gray-200">
               <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8"><svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg></div>
               <h3 className="text-xl font-black text-gray-300 uppercase italic tracking-tighter">Chọn một hành trình yêu thương để bắt đầu</h3>
            </div>
          )}
        </div>
      </div>

      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md" onClick={() => setIsGroupModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95">
             <h3 className="text-2xl font-black italic uppercase text-emerald-900 mb-8">Lập nhóm chat chung</h3>
             <div className="space-y-6">
                <input className="w-full bg-gray-50 p-5 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500 border-none transition-all" placeholder="Tên nhóm (Vd: Hội tặng sách Quận 1)" value={groupName} onChange={e => setGroupName(e.target.value)} />
                
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Chọn đồng đội mời vào nhóm</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {friendsList.map(friend => (
                      <div 
                        key={friend.id} 
                        onClick={() => setSelectedFriends(prev => prev.includes(friend.id) ? prev.filter(id => id !== friend.id) : [...prev, friend.id])}
                        className={`p-3 rounded-2xl flex items-center space-x-4 cursor-pointer transition-all ${selectedFriends.includes(friend.id) ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-50 text-gray-600'}`}
                      >
                        <img src={friend.avatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
                        <span className="flex-1 font-bold text-xs uppercase italic">{friend.name}</span>
                        {selectedFriends.includes(friend.id) && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                      </div>
                    ))}
                    {friendsList.length === 0 && <p className="text-center text-[10px] text-gray-400 font-bold uppercase italic py-4">Đệ chưa có bạn bè để mời vào nhóm...</p>}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setIsGroupModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400">Đóng</button>
                  <button onClick={handleCreateGroup} className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-emerald-100">Tạo nhóm ngay</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
