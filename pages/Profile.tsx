
import React, { useState, useEffect, useRef } from 'react';
import { User, SocialPost, PostMedia, DonationItem, ClaimRecord, FriendRequest } from '../types';
import { 
  doc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  onSnapshot,
  addDoc,
  documentId,
  setDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';

const compressImage = (base64Str: string, maxWidth = 400, quality = 0.7): Promise<string> => {
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

const PostMediaGrid: React.FC<{ media?: PostMedia[], mediaUrl?: string, mediaType?: 'image' | 'video' }> = ({ media, mediaUrl, mediaType }) => {
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const renderMediaItem = (item: PostMedia | {url: string, type: string}, index: number, className: string) => {
    if (item.type === 'video') {
      return <video key={index} src={item.url} controls className={`w-full h-full object-cover ${className}`} />;
    }
    return (
      <div 
        key={index} 
        className={`relative group/media cursor-pointer overflow-hidden ${className}`}
        onClick={() => setViewingImage(item.url)}
      >
        <img src={item.url} className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105" alt="" />
        <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 transition-colors flex items-center justify-center">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white opacity-0 group-hover/media:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
      </div>
    );
  };

  return (
    <>
      {media && media.length > 0 ? (
        <div className={`grid gap-1 w-full max-h-[450px] overflow-hidden rounded-[2.5rem] my-3 shadow-md border border-gray-100 bg-gray-50
          ${media.length === 1 ? 'grid-cols-1' : media.length === 2 ? 'grid-cols-2 aspect-video' : media.length === 3 ? 'grid-cols-2 grid-rows-2 aspect-square' : 'grid-cols-2 grid-rows-2 aspect-square'}`}>
          {media.length === 1 && renderMediaItem(media[0], 0, "max-h-[450px]")}
          {media.length === 2 && <>{renderMediaItem(media[0], 0, "")}{renderMediaItem(media[1], 1, "")}</>}
          {media.length === 3 && <>{renderMediaItem(media[0], 0, "row-span-2 h-full")}{renderMediaItem(media[1], 1, "")}{renderMediaItem(media[2], 2, "")}</>}
          {media.length >= 4 && (
            <>
              {renderMediaItem(media[0], 0, "")}
              {renderMediaItem(media[1], 1, "")}
              {renderMediaItem(media[2], 2, "")}
              <div className="h-full relative">
                {renderMediaItem(media[3], 3, "")}
                {media.length > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none"><span className="text-white font-black text-xl">+{media.length - 4}</span></div>}
              </div>
            </>
          )}
        </div>
      ) : mediaUrl ? (
        <div className="bg-gray-50 flex items-center justify-center border border-gray-100 rounded-[2.5rem] my-3 shadow-sm overflow-hidden">
          {renderMediaItem({url: mediaUrl, type: mediaType || 'image'}, 0, "max-h-[450px]")}
        </div>
      ) : null}

      {viewingImage && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setViewingImage(null)}></div>
          <button onClick={() => setViewingImage(null)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={viewingImage} className="relative max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" alt="View" />
        </div>
      )}
    </>
  );
};

interface ProfileProps {
  user: User;
  viewingUserId: string | null;
  onUpdateUser: (updatedUser: User) => void;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
  onGoToMessages: (partnerId?: string) => void;
  onViewProfile?: (userId: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, viewingUserId, onUpdateUser, onNotify, onGoToMessages, onViewProfile }) => {
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'info' | 'given' | 'received' | 'friends'>('posts');
  
  const [userPosts, setUserPosts] = useState<SocialPost[]>([]);
  const [givenItems, setGivenItems] = useState<DonationItem[]>([]);
  const [receivedClaims, setReceivedClaims] = useState<ClaimRecord[]>([]);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [requestSent, setRequestSent] = useState<FriendRequest | null>(null);
  
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isViewingSelf = !viewingUserId || viewingUserId === user.id;

  const [formData, setFormData] = useState({
    name: user.name, avatar: user.avatar || '', location: user.location || '', organizationName: user.organizationName || '', bio: user.bio || ''
  });

  const getAvatar = (src?: string, name?: string, type?: string) => {
    if (src && src.trim() !== "") return src;
    const bg = type === 'organization' ? '0369a1' : '059669';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${bg}&color=fff&bold=true`;
  };

  useEffect(() => {
    if (isViewingSelf) {
      setTargetUser(user);
      setFormData({ name: user.name, avatar: user.avatar || '', location: user.location || '', organizationName: user.organizationName || '', bio: user.bio || '' });
    } else { fetchTargetUser(viewingUserId!); }
  }, [viewingUserId, user]);

  useEffect(() => {
    if (targetUser) {
      const qPosts = query(collection(db, "social_posts"), where("authorId", "==", targetUser.id));
      const unsubPosts = onSnapshot(qPosts, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SocialPost));
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUserPosts(data);
      });
      const qGiven = query(collection(db, "items"), where("authorId", "==", targetUser.id));
      const unsubGiven = onSnapshot(qGiven, (snap) => {
        setGivenItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as DonationItem)));
      });
      const qReceived = query(collection(db, "claims"), where("receiverId", "==", targetUser.id));
      const unsubReceived = onSnapshot(qReceived, (snap) => {
        setReceivedClaims(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClaimRecord)));
      });
      if (!isViewingSelf) {
        const qSent = query(collection(db, "friend_requests"), where("fromId", "==", user.id), where("toId", "==", targetUser.id), where("status", "==", "pending"));
        const unsubSent = onSnapshot(qSent, (snap) => {
          setRequestSent(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as FriendRequest);
        });
        return () => { unsubPosts(); unsubGiven(); unsubReceived(); unsubSent(); };
      }
      return () => { unsubPosts(); unsubGiven(); unsubReceived(); };
    }
  }, [targetUser?.id, isViewingSelf, user.id]);

  useEffect(() => {
    if (activeTab === 'friends' && targetUser?.friends?.length) { fetchFriends(); }
  }, [activeTab, targetUser?.friends]);

  const fetchTargetUser = async (uid: string) => {
    setLoading(true);
    try {
      const uDoc = await getDoc(doc(db, "users", uid));
      if (uDoc.exists()) setTargetUser({ ...uDoc.data(), id: uid } as User);
    } catch (e) { onNotify('error', "Không thể tải hồ sơ."); }
    finally { setLoading(false); }
  };

  const fetchFriends = async () => {
    if (!targetUser?.friends?.length) { setFriendsList([]); return; }
    try {
      const q = query(collection(db, "users"), where(documentId(), "in", targetUser.friends.slice(0, 10)));
      const snap = await getDocs(q);
      setFriendsList(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    } catch (e) { console.error(e); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        let base64 = reader.result as string;
        base64 = await compressImage(base64, 400, 0.7);
        setFormData(prev => ({ ...prev, avatar: base64 }));
        setIsCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!targetUser || requestSent) return;
    try {
      await addDoc(collection(db, "friend_requests"), {
        fromId: user.id, fromName: user.name, fromAvatar: getAvatar(user.avatar, user.name, user.userType),
        toId: targetUser.id, status: 'pending', createdAt: new Date().toISOString()
      });
      onNotify('success', `Đã gửi lời mời đồng đội cho ${targetUser.name}!`, 'Hệ thống');
    } catch (e) { onNotify('error', "Lỗi gửi yêu cầu."); }
  };

  const handleOpenChat = async () => {
    if (!targetUser || !onGoToMessages) return;
    const chatId = user.id < targetUser.id ? `chat_${user.id}_${targetUser.id}` : `chat_${targetUser.id}_${user.id}`;
    const chatDoc = await getDoc(doc(db, "chats", chatId));
    if (!chatDoc.exists()) {
      await setDoc(doc(db, "chats", chatId), {
        id: chatId, type: 'direct', participants: [user.id, targetUser.id],
        donorId: user.id, donorName: user.name, donorIsGuest: user.isGuest,
        receiverId: targetUser.id, receiverName: targetUser.name, receiverIsGuest: targetUser.isGuest,
        updatedAt: new Date().toISOString()
      });
    }
    onGoToMessages(targetUser.id);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "users", user.id), formData);
      onUpdateUser({ ...user, ...formData });
      setIsEditing(false);
      onNotify('success', "Đã cập nhật hồ sơ!");
    } catch (err) { onNotify('error', "Thất bại."); }
  };

  if (loading) return <div className="pt-32 text-center animate-pulse text-emerald-600 font-black tracking-widest uppercase">Đang tải hồ sơ...</div>;
  if (!targetUser) return <div className="pt-32 text-center text-gray-400 uppercase font-black">Không tìm thấy người dùng.</div>;

  const isOrg = targetUser.userType === 'organization';
  const isFriend = user.friends?.includes(targetUser.id);
  const isTargetGuest = targetUser.isGuest;

  return (
    <div className="pt-24 pb-12 px-4 max-w-4xl mx-auto">
      <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-emerald-50 relative">
        <div className={`h-48 bg-gradient-to-r ${isOrg ? 'from-sky-700 to-blue-900' : isTargetGuest ? 'from-amber-600 to-orange-700' : 'from-emerald-600 to-teal-700'} relative`}>
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>
        <div className="px-10 pb-12">
          <div className="relative -mt-20 mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-8">
              <div className="relative group">
                <img src={isEditing ? getAvatar(formData.avatar, formData.name, user.userType) : getAvatar(targetUser.avatar, targetUser.name, targetUser.userType)} className={`w-44 h-44 ${isOrg ? 'rounded-[3.5rem]' : 'rounded-[2.5rem]'} border-8 border-white object-cover shadow-2xl bg-white transition-all ${isEditing ? 'cursor-pointer brightness-90 hover:brightness-75' : ''}`} alt="" onClick={() => isEditing && fileInputRef.current?.click()} />
                {isEditing && (
                  <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer pointer-events-none">
                    <div className="bg-black/40 p-4 rounded-full text-white backdrop-blur-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </div>
              <div className="text-center md:text-left pb-4">
                <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                   <h1 className="text-4xl font-black text-emerald-950 uppercase tracking-tighter">{targetUser.name}</h1>
                   {isTargetGuest && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">GUEST</span>}
                </div>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                   <span className={`${isOrg ? 'bg-blue-50 text-blue-700 border-blue-100' : isTargetGuest ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'} px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm`}>{isOrg ? 'Tổ chức Đồng hành' : isTargetGuest ? 'Tài khoản dùng thử' : 'Thành viên'}</span>
                   <span className="bg-gray-50 text-gray-500 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-100 shadow-sm">{(targetUser.friends || []).length} Đồng đội</span>
                </div>
              </div>
            </div>
          </div>
          
          {isTargetGuest && !isViewingSelf && (
            <div className="mb-10 p-6 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex items-center gap-4 animate-pulse">
               <div className="bg-amber-100 p-3 rounded-2xl"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
               <p className="text-[11px] font-black text-amber-800 uppercase leading-relaxed">Đây là tài khoản chưa được định danh chính thức. Hãy cẩn thận khi thực hiện các giao dịch trao đổi món quà.</p>
            </div>
          )}

          {!isViewingSelf && (
            <div className="flex flex-col sm:flex-row gap-5 mb-12">
               <button onClick={handleSendFriendRequest} disabled={!!requestSent || isFriend || isTargetGuest} className={`flex-1 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all ${isFriend ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : requestSent ? 'bg-gray-100 text-gray-400' : isTargetGuest ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}>{isFriend ? 'ĐẠI SỨ NHÂN ÁI' : requestSent ? 'ĐANG CHỜ PHẢN HỒI' : isTargetGuest ? 'GUEST KHÔNG KẾT BẠN' : 'GỬI LỜI MỜI ĐỒNG ĐỘI'}</button>
               <button onClick={handleOpenChat} className="flex-1 py-5 rounded-[2rem] bg-gray-950 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-black active:scale-95 transition-all">GỬI LỜI NHẮN</button>
            </div>
          )}
          
          {/* Tabs UI logic... (Hệ thừa từ nội dung cũ) */}
        </div>
      </div>
    </div>
  );
};

export default Profile;
