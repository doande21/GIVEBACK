
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatSession, ChatMessage, DonationItem } from '../types';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  orderBy,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db } from '../services/firebase';

interface MessagesProps {
  user: User;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
  onConfirm?: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info') => void;
  onViewProfile?: (userId: string) => void;
}

const STICKERS = [
  '😊', '😂', '🥰', '😍', '😒', '😭', '😱', '😴', '🥳', '😎',
  '👍', '👎', '❤️', '🔥', '✨', '🎉', '🎁', '🙏', '🤝', '💪'
];

const calculateAITrustScore = (donated: number, received: number) => {
  if (donated === 0 && received === 0) {
    return {
      score: 50,
      label: 'Tài khoản mới',
      color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
      icon: '🌱',
      desc: 'Tài khoản mới tạo. Tỷ lệ Xin/Tặng bằng 0. Chưa có dữ liệu giao dịch trên hệ thống.'
    };
  }

  // Tính điểm RAW không giới hạn trên (để phản ánh đúng thực tế)
  let score = 50 + (donated * 15) - (received * 10);
  if (score < 10) score = 10; // Chỉ giới hạn tối thiểu

  // Ngưỡng tier: >=70 ưu tiên, >=40 bình thường, <40 cảnh báo
  if (score >= 70) {
    return { score, label: 'Đề cử ưu tiên', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: '🏅', desc: `Tài khoản uy tín. Tỷ lệ Xin/Tặng rất tốt (Đã tặng ${donated} món, nhận ${received} món).` };
  } else if (score >= 40) {
    return { score, label: 'Bình thường', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: '⚖️', desc: `Tài khoản tiêu chuẩn. Hoạt động bình thường (Đã tặng ${donated} món, nhận ${received} món).` };
  } else {
    return { score, label: 'Cảnh báo thu gom', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: '⚠️', desc: `Nguy cơ gom hàng! Cần xác minh (Đã nhận ${received} món nhưng chỉ tặng ${donated} món).` };
  }
};


const Messages: React.FC<MessagesProps> = ({ user, onNotify, onConfirm, onViewProfile }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chats' | 'people' | 'archive'>('chats');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [aiScores, setAiScores] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);


  // Hàm tính lại điểm cho một user cụ thể (dùng sau khi xác nhận tặng quà)
  const refreshScoreForUser = async (userId: string) => {
    try {
      const donatedQuery = query(collection(db, "items"), where("authorId", "==", userId));
      const receivedQuery = query(collection(db, "claims"), where("receiverId", "==", userId));
      const [dSnap, rSnap] = await Promise.all([getDocs(donatedQuery), getDocs(receivedQuery)]);
      const newScore = calculateAITrustScore(dSnap.size, rSnap.size);
      setAiScores(prev => ({ ...prev, [userId]: newScore }));
    } catch (err) {
      console.error("refreshScoreForUser error:", err);
    }
  };

  useEffect(() => {
    const fetchScores = async () => {
      if (!chats.length) return;

      const relevantUserIds = new Set<string>();
      chats.forEach(c => {
        const otherId = (c.participants && Array.isArray(c.participants))
          ? c.participants.find(p => p !== user.id)
          : (c.donorId === user.id ? c.receiverId : c.donorId);
        if (otherId) relevantUserIds.add(otherId);
      });

      const newScores = { ...aiScores };
      let updated = false;

      for (const rId of relevantUserIds) {
        // Chỉ fetch nếu chưa có điểm (tránh gọi lại không cần thiết)
        // Điểm sẽ được refresh thủ công qua refreshScoreForUser khi có giao dịch
        if (!newScores[rId]) {
          try {
            const donatedQuery = query(collection(db, "items"), where("authorId", "==", rId));
            const receivedQuery = query(collection(db, "claims"), where("receiverId", "==", rId));
            const [dSnap, rSnap] = await Promise.all([getDocs(donatedQuery), getDocs(receivedQuery)]);
            newScores[rId] = calculateAITrustScore(dSnap.size, rSnap.size);
            updated = true;
          } catch (err) {
            console.error(err);
          }
        }
      }

      if (updated) setAiScores(newScores);
    };

    fetchScores();
  }, [chats, user.id]);

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

  // Mark as read when active chat has new messages
  useEffect(() => {
    if (!activeChat) return;

    const currentChat = chats.find(c => c.id === activeChat.id);
    if (currentChat && currentChat.lastSenderId !== user.id && !currentChat.readBy?.includes(user.id)) {
      const markAsRead = async () => {
        try {
          await updateDoc(doc(db, "chats", activeChat.id), {
            readBy: arrayUnion(user.id)
          });
        } catch (err) {
          console.error("Error marking as read:", err);
        }
      };
      markAsRead();
    }
  }, [activeChat?.id, chats, user.id]);

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
        updatedAt: new Date().toISOString(),
        readBy: [user.id] // Reset readBy to only the sender when a new message is sent
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

        // 2. Decrement item quantity
        const newQuantity = currentQuantity - 1;
        await updateDoc(itemRef, {
          quantity: increment(-1),
          status: newQuantity <= 0 ? 'claimed' : 'available',
          updatedAt: new Date().toISOString()
        });

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

        // Cập nhật điểm AI tức thì cho cả người nhận và người tặng
        await Promise.all([
          refreshScoreForUser(activeChat.receiverId),
          refreshScoreForUser(activeChat.donorId)
        ]);
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

  const handleRejectGift = async () => {
    if (!activeChat || !activeChat.itemId) return;

    const performReject = async () => {
      try {
        await updateDoc(doc(db, "chats", activeChat.id), {
          giftStatus: 'rejected',
          updatedAt: new Date().toISOString()
        });

        await addDoc(collection(db, "chats", activeChat.id, "messages"), {
          senderId: 'system',
          senderName: 'Hệ thống',
          text: `❌ Rất tiếc, món quà "${activeChat.itemTitle}" đã bị từ chối yêu cầu .`,
          createdAt: new Date().toISOString()
        });

        onNotify('info', "Đã từ chối yêu cầu nhận quà.");
      } catch (err) {
        console.error("Reject Gift Error:", err);
        onNotify('error', "Có lỗi xảy ra khi từ chối.");
      }
    };

    if (onConfirm) {
      onConfirm(
        "Từ chối tặng quà",
        `Bạn có chắc chắn muốn từ chối yêu cầu nhận "${activeChat.itemTitle}" từ ${activeChat.receiverName} không?`,
        performReject,
        'danger'
      );
    } else {
      performReject();
    }
  };

  const handleArchiveChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "chats", chatId), {
        archivedBy: arrayUnion(user.id)
      });
      onNotify('success', "Đã lưu trữ cuộc hội thoại.");
      setOpenMenuId(null);
      if (activeChat?.id === chatId) setActiveChat(null);
    } catch (err) {
      onNotify('error', "Không thể lưu trữ.");
    }
  };

  const handleUnarchiveChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "chats", chatId), {
        archivedBy: arrayRemove(user.id)
      });
      onNotify('success', "Đã bỏ lưu trữ cuộc hội thoại.");
      setOpenMenuId(null);
    } catch (err) {
      onNotify('error', "Không thể bỏ lưu trữ.");
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const performDelete = async () => {
      try {
        await updateDoc(doc(db, "chats", chatId), {
          deletedBy: arrayUnion(user.id)
        });
        onNotify('success', "Đã xóa cuộc hội thoại.");
        setOpenMenuId(null);
        if (activeChat?.id === chatId) setActiveChat(null);
      } catch (err) {
        onNotify('error', "Không thể xóa.");
      }
    };

    if (onConfirm) {
      onConfirm(
        "Xóa cuộc hội thoại",
        "Bạn có chắc chắn muốn xóa cuộc hội thoại này không? Hành động này không thể hoàn tác.",
        performDelete,
        'danger'
      );
    } else {
      performDelete();
    }
  };

  const filteredChats = chats.filter(chat => {
    const isDeleted = chat.deletedBy?.includes(user.id);
    const isArchived = chat.archivedBy?.includes(user.id);

    if (isDeleted) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const otherName = (chat.donorId === user.id ? chat.receiverName : chat.donorName) || '';
      const itemTitle = chat.itemTitle || '';
      const lastMsg = chat.lastMessage || '';
      if (!otherName.toLowerCase().includes(q) && !itemTitle.toLowerCase().includes(q) && !lastMsg.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (activeSidebarTab === 'chats') {
      return !isArchived;
    }
    if (activeSidebarTab === 'archive') {
      return isArchived;
    }
    return true; // 'people' tab shows all for now
  }).sort((a, b) => {
    // 1. Nhóm các cuộc hẹn vào theo Món đồ (itemId)
    const itemGroupIdA = a.itemId || `direct_${a.id}`;
    const itemGroupIdB = b.itemId || `direct_${b.id}`;

    if (itemGroupIdA !== itemGroupIdB) {
      // Thuật toán lấy đoạn chat MỚI NHẤT của món đồ A so với món đồ B để nâng cả cụm lên
      const maxTimeA = Math.max(...chats.filter(c => (c.itemId || `direct_${c.id}`) === itemGroupIdA).map(c => new Date(c.updatedAt).getTime()));
      const maxTimeB = Math.max(...chats.filter(c => (c.itemId || `direct_${c.id}`) === itemGroupIdB).map(c => new Date(c.updatedAt).getTime()));

      if (maxTimeA !== maxTimeB) {
        return maxTimeB - maxTimeA;
      }
    }

    // 2. NẾU CÙNG 1 MÓN ĐỒ: Dùng điểm AI để xem ai uy tín hơn được phép trồi lên đầu
    const getScore = (c: ChatSession) => {
      const otherUserId = (c.participants && Array.isArray(c.participants))
        ? c.participants.find(p => p !== user.id)
        : (c.donorId === user.id ? c.receiverId : c.donorId);

      if (!otherUserId) return 50;
      const aiData = aiScores[otherUserId];
      return aiData ? aiData.score : 50;
    };

    const scoreA = getScore(a);
    const scoreB = getScore(b);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    // 3. NẾU BẰNG ĐIỂM NHAU (hoặc cùng mốc): Ưu tiên ai nhắn tin gần nhất
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="pt-20 h-screen flex bg-[#0d1117] font-['Inter'] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 md:w-96 border-r border-gray-800 flex flex-col bg-[#111b21]">
        {/* Sidebar Header */}
        <div className="p-4">
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Chats</h2>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm"
              className="w-full bg-[#202c33] border-none rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all text-white placeholder:text-gray-500"
            />
          </div>


        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredChats.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                {activeSidebarTab === 'archive' ? 'Kho lưu trữ trống' : 'Chưa có tin nhắn'}
              </p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const otherParticipant = chat.donorId === user.id ? chat.receiverName : chat.donorName;
              const isActive = activeChat?.id === chat.id;
              const isArchived = chat.archivedBy?.includes(user.id);

              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-all relative group ${isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
                >
                  <div className="relative" onClick={(e) => {
                    if (onViewProfile) {
                      e.stopPropagation();
                      onViewProfile(chat.donorId === user.id ? chat.receiverId : chat.donorId);
                    }
                  }}>
                    <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xl">
                      {otherParticipant.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111b21] rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <h4 className="text-[15px] font-bold text-white truncate">{otherParticipant}</h4>
                        {(() => {
                          const otherUserId = (chat.participants && Array.isArray(chat.participants))
                            ? chat.participants.find(p => p !== user.id)
                            : (chat.donorId === user.id ? chat.receiverId : chat.donorId);
                          if (!otherUserId) return null;
                          const aiData = aiScores[otherUserId];
                          return aiData ? (
                            <span title={aiData.desc} className={`flex-shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${aiData.color}`}>
                              {aiData.icon} {aiData.label}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <span className="text-[11px] text-gray-500 whitespace-nowrap">{new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[13px] text-gray-400 truncate pr-2">{chat.lastMessage}</p>
                      <div className="flex items-center gap-2">
                        {chat.lastSenderId !== user.id && (!chat.readBy || !chat.readBy.includes(user.id)) && (
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === chat.id ? null : chat.id);
                          }}
                          className="p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {openMenuId === chat.id && (
                    <div className="absolute right-4 top-12 bg-[#233138] border border-gray-700 rounded-xl shadow-2xl z-30 py-2 w-48 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={(e) => isArchived ? handleUnarchiveChat(chat.id, e) : handleArchiveChat(chat.id, e)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-[#182229] flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        {isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ'}
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[#182229] flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Xóa cuộc trò chuyện
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Bottom Nav */}
        <div className="p-2 border-t border-gray-800 flex justify-around bg-[#111b21]">
          <button
            onClick={() => setActiveSidebarTab('chats')}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${activeSidebarTab === 'chats' ? 'text-emerald-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.47 0-2.84-.39-4.03-1.06l-.29-.17-3.01.88.89-2.93-.18-.3C4.39 15.23 4 13.67 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" /></svg>
            <span className="text-[10px] font-bold">Đoạn chat</span>
          </button>
          <button
            onClick={() => setActiveSidebarTab('people')}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${activeSidebarTab === 'people' ? 'text-emerald-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span className="text-[10px] font-bold">Mọi người</span>
          </button>
          <button
            onClick={() => setActiveSidebarTab('archive')}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${activeSidebarTab === 'archive' ? 'text-emerald-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
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
                <div className="relative" onClick={() => {
                  if (onViewProfile) {
                    onViewProfile(activeChat.donorId === user.id ? activeChat.receiverId : activeChat.donorId);
                  }
                }}>
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer">
                    {(activeChat.donorId === user.id ? activeChat.receiverName : activeChat.donorName).charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#111b21] rounded-full"></div>
                </div>
                <div className="cursor-pointer" onClick={() => {
                  if (onViewProfile) {
                    onViewProfile(activeChat.donorId === user.id ? activeChat.receiverId : activeChat.donorId);
                  }
                }}>
                  <h3 className="text-[15px] font-bold text-white leading-tight">{activeChat.donorId === user.id ? activeChat.receiverName : activeChat.donorName}</h3>
                  <p className="text-[11px] text-gray-400">Đang hoạt động</p>
                </div>
              </div>


            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[#0d1117]">
              <div className="flex justify-center my-6">
                <span className="bg-gray-800/50 text-gray-500 text-[11px] font-bold px-3 py-1 rounded-md uppercase tracking-widest">Hôm nay</span>
              </div>

              {activeChat.itemId && (
                <div className="flex flex-col items-center gap-4 mb-6">
                  <div className="bg-[#161b22] border border-gray-800 p-3 rounded-2xl flex items-center gap-4 max-w-sm w-full shadow-xl">
                    <img src={activeChat.itemImage} className="w-16 h-16 rounded-xl object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase text-emerald-500 mb-1">Đang trao đổi món quà</p>
                      <p className="text-sm font-bold text-gray-200 truncate mb-2">{activeChat.itemTitle}</p>
                      {activeChat.donorId === user.id && activeChat.giftStatus !== 'completed' && activeChat.giftStatus !== 'rejected' ? (
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={handleRejectGift}
                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-2 rounded-lg text-[11px] font-bold uppercase transition-all"
                          >
                            Từ chối ❌
                          </button>
                          <button
                            onClick={handleConfirmGift}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-[11px] font-bold uppercase transition-all"
                          >
                            Tặng quà 🎁
                          </button>
                        </div>
                      ) : (
                        <div className={`text-center py-2 border rounded-lg text-[11px] font-bold uppercase ${activeChat.giftStatus === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                          {activeChat.giftStatus === 'completed' ? 'Đã hoàn tất tặng'
                            : activeChat.giftStatus === 'rejected' ? 'Đã từ chối tặng'
                              : 'Đang chờ xác nhận'}
                        </div>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const otherUserId = (activeChat.participants && Array.isArray(activeChat.participants))
                      ? activeChat.participants.find(p => p !== user.id)
                      : (activeChat.donorId === user.id ? activeChat.receiverId : activeChat.donorId);
                    if (!otherUserId) return null;
                    const aiData = aiScores[otherUserId];
                    if (!aiData) return null;
                    return (
                      <div className={`bg-[#111b21] border p-4 rounded-2xl flex flex-col gap-3 max-w-sm w-full shadow-lg relative overflow-hidden ${aiData.color.split(' ')[2]}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
                            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">GIVEBACK AI Đánh giá</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${aiData.color}`}>Điểm: {aiData.score}</span>
                        </div>

                        <div className="flex items-start gap-3 relative z-10 bg-[#0d1117]/50 p-3 rounded-xl">
                          <div className="text-2xl">{aiData.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold mb-1 ${aiData.color.split(' ')[0]}`}>{aiData.label}</p>
                            <p className="text-xs text-gray-400 leading-relaxed">{aiData.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
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
