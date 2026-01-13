
import React, { useState, useEffect } from 'react';
import { User, SocialPost, PostComment, PostMedia, DonationItem, ClaimRecord, FriendRequest } from '../types';
import { 
  doc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  arrayUnion, 
  arrayRemove, 
  getDoc, 
  onSnapshot,
  addDoc,
  deleteDoc,
  documentId
} from 'firebase/firestore';
import { db } from '../services/firebase';

interface ProfileProps {
  user: User;
  viewingUserId?: string | null;
  onUpdateUser: (updatedUser: User) => void;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
  onGoToMessages?: (partnerId: string) => void;
}

const PostMediaGrid: React.FC<{ media?: PostMedia[], mediaUrl?: string, mediaType?: 'image' | 'video' }> = ({ media, mediaUrl, mediaType }) => {
  const renderMediaItem = (item: PostMedia | {url: string, type: string}, index: number, className: string) => {
    if (item.type === 'video') {
      return <video key={index} src={item.url} controls className={`w-full h-full object-cover ${className}`} />;
    }
    return <img key={index} src={item.url} className={`w-full h-full object-cover ${className}`} alt="" />;
  };

  if (media && media.length > 0) {
    const count = media.length;
    return (
      <div className={`grid gap-1 w-full max-h-[450px] overflow-hidden rounded-[1.5rem] my-3 shadow-md border border-gray-100 bg-gray-50
        ${count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2 aspect-video' : count === 3 ? 'grid-cols-2 grid-rows-2 aspect-square' : 'grid-cols-2 grid-rows-2 aspect-square'}`}>
        {count === 1 && <div className="w-full">{renderMediaItem(media[0], 0, "max-h-[450px]")}</div>}
        {count === 2 && <>{renderMediaItem(media[0], 0, "")}{renderMediaItem(media[1], 1, "")}</>}
        {count === 3 && <><div className="row-span-2 h-full">{renderMediaItem(media[0], 0, "")}</div>{renderMediaItem(media[1], 1, "")}{renderMediaItem(media[2], 2, "")}</>}
        {count >= 4 && <>{renderMediaItem(media[0], 0, "")}{renderMediaItem(media[1], 1, "")}{renderMediaItem(media[2], 2, "")}<div className="h-full relative">{renderMediaItem(media[3], 3, "")}{count > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-black text-xl">+{count - 4}</span></div>}</div></>}
      </div>
    );
  }

  if (mediaUrl) {
    return (
      <div className="bg-gray-50 flex items-center justify-center border border-gray-100 rounded-[1.5rem] my-3 shadow-sm overflow-hidden">
        {mediaType === 'video' ? <video src={mediaUrl} controls className="w-full max-h-[400px]" /> : <img src={mediaUrl} className="w-full h-auto object-contain max-h-[450px]" alt="" />}
      </div>
    );
  }
  return null;
};

const Profile: React.FC<ProfileProps> = ({ user, viewingUserId, onUpdateUser, onNotify, onGoToMessages }) => {
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'info' | 'given' | 'received' | 'friends' | 'requests'>('posts');
  
  const [userPosts, setUserPosts] = useState<SocialPost[]>([]);
  const [givenItems, setGivenItems] = useState<DonationItem[]>([]);
  const [receivedClaims, setReceivedClaims] = useState<ClaimRecord[]>([]);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  
  const [requestSent, setRequestSent] = useState<FriendRequest | null>(null);
  const [requestReceived, setRequestReceived] = useState<FriendRequest | null>(null);
  const [allIncomingRequests, setAllIncomingRequests] = useState<FriendRequest[]>([]);

  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const isViewingSelf = !viewingUserId || viewingUserId === user.id;

  const [formData, setFormData] = useState({
    name: user.name,
    avatar: user.avatar || '',
    location: user.location || '',
    organizationName: user.organizationName || '',
    bio: user.bio || ''
  });

  const getAvatar = (src?: string, name?: string, type?: string) => {
    if (src && src.trim() !== "") return src;
    const bg = type === 'organization' ? '0369a1' : '059669';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${bg}&color=fff&bold=true`;
  };

  useEffect(() => {
    if (isViewingSelf) {
      setTargetUser(user);
      setFormData({
        name: user.name,
        avatar: user.avatar || '',
        location: user.location || '',
        organizationName: user.organizationName || '',
        bio: user.bio || ''
      });
    } else {
      fetchTargetUser(viewingUserId!);
    }
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

      if (isViewingSelf) {
        const qAllRecv = query(collection(db, "friend_requests"), where("toId", "==", user.id), where("status", "==", "pending"));
        const unsubAllRecv = onSnapshot(qAllRecv, (snap) => {
          setAllIncomingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest)));
        });
        return () => { unsubPosts(); unsubGiven(); unsubReceived(); unsubAllRecv(); };
      }

      const qSent = query(collection(db, "friend_requests"), where("fromId", "==", user.id), where("toId", "==", targetUser.id), where("status", "==", "pending"));
      const unsubSent = onSnapshot(qSent, (snap) => {
        setRequestSent(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as FriendRequest);
      });

      const qRecv = query(collection(db, "friend_requests"), where("fromId", "==", targetUser.id), where("toId", "==", user.id), where("status", "==", "pending"));
      const unsubRecv = onSnapshot(qRecv, (snap) => {
        setRequestReceived(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as FriendRequest);
      });

      return () => { unsubPosts(); unsubGiven(); unsubReceived(); unsubSent(); unsubRecv(); };
    }
  }, [targetUser?.id, isViewingSelf, user.id]);

  useEffect(() => {
    if (activeTab === 'friends' && targetUser?.friends?.length) {
      fetchFriends();
    }
  }, [activeTab, targetUser?.friends]);

  const fetchTargetUser = async (uid: string) => {
    setLoading(true);
    try {
      const uDoc = await getDoc(doc(db, "users", uid));
      if (uDoc.exists()) {
        setTargetUser({ ...uDoc.data(), id: uid } as User);
      }
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

  const sendRequest = async () => {
    if (!targetUser) return;
    try {
      await addDoc(collection(db, "friend_requests"), {
        fromId: user.id,
        fromName: user.name,
        fromAvatar: getAvatar(user.avatar, user.name, user.userType),
        toId: targetUser.id,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      onNotify('success', `Đã gửi lời mời đồng đội cho ${targetUser.name}!`, 'Bạn bè');
    } catch (e) { onNotify('error', "Không thể gửi lời mời."); }
  };

  const acceptRequest = async (request?: FriendRequest) => {
    const req = request || requestReceived;
    if (!targetUser || !req) return;
    try {
      const userRef = doc(db, "users", user.id);
      const friendRef = doc(db, "users", req.fromId === user.id ? req.toId : req.fromId);
      await updateDoc(userRef, { friends: arrayUnion(friendRef.id) });
      await updateDoc(friendRef, { friends: arrayUnion(user.id) });
      await deleteDoc(doc(db, "friend_requests", req.id));
      const updatedFriends = [...(user.friends || []), friendRef.id];
      onUpdateUser({ ...user, friends: updatedFriends });
      onNotify('success', `Kết nối đồng đội thành công!`, 'Bạn bè');
      if (targetUser.id === friendRef.id) setTargetUser({...targetUser, friends: [...(targetUser.friends || []), user.id]});
    } catch (e) { onNotify('error', "Thao tác thất bại."); }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, "friend_requests", requestId));
      onNotify('info', "Đã xóa lời mời.", 'Bạn bè');
    } catch (e) { onNotify('error', "Thao tác thất bại."); }
  };

  const removeFriend = async () => {
    if (!targetUser) return;
    if (!window.confirm(`Bạn có chắc muốn hủy kết nối với ${targetUser.name}?`)) return;
    try {
      const userRef = doc(db, "users", user.id);
      const friendRef = doc(db, "users", targetUser.id);
      await updateDoc(userRef, { friends: arrayRemove(targetUser.id) });
      await updateDoc(friendRef, { friends: arrayRemove(user.id) });
      onUpdateUser({ ...user, friends: user.friends?.filter(id => id !== targetUser.id) });
      onNotify('info', `Đã hủy kết nối.`, 'Bạn bè');
      setTargetUser({...targetUser, friends: targetUser.friends?.filter(id => id !== user.id)});
    } catch (e) { onNotify('error', "Thao tác thất bại."); }
  };

  const handleReaction = async (post: SocialPost, type: 'likes' | 'hearts' | 'thanks') => {
    const postRef = doc(db, "social_posts", post.id);
    const list = (post as any)[type] || [];
    const hasReacted = list.includes(user.id);
    try {
      if (hasReacted) await updateDoc(postRef, { [type]: arrayRemove(user.id) });
      else await updateDoc(postRef, { [type]: arrayUnion(user.id) });
    } catch (err) { onNotify('error', "Lỗi tương tác."); }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;
    try {
      const postRef = doc(db, "social_posts", postId);
      const newComment: PostComment = {
        id: Math.random().toString(36).substr(2, 9),
        authorId: user.id,
        authorName: user.name,
        authorAvatar: getAvatar(user.avatar, user.name, user.userType),
        text: commentText.trim(),
        createdAt: new Date().toISOString()
      };
      await updateDoc(postRef, { comments: arrayUnion(newComment) });
      setCommentText('');
    } catch (err) { onNotify('error', "Lỗi gửi bình luận."); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "users", user.id), formData);
      onUpdateUser({ ...user, ...formData });
      setIsEditing(false);
      onNotify('success', "Đã cập nhật hồ sơ!", 'Hệ thống');
    } catch (err) { onNotify('error', "Thất bại."); }
  };

  if (loading) return <div className="pt-32 text-center animate-pulse text-emerald-600 font-black tracking-widest uppercase">Đang tải hồ sơ...</div>;
  if (!targetUser) return <div className="pt-32 text-center text-gray-400 uppercase font-black italic">Không tìm thấy người dùng.</div>;

  const isOrg = targetUser.userType === 'organization';

  return (
    <div className="pt-24 pb-12 px-4 max-w-4xl mx-auto font-['Inter']">
      <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-emerald-50 relative">
        <div className={`h-40 bg-gradient-to-r ${isOrg ? 'from-sky-700 to-blue-900' : 'from-emerald-600 to-teal-700'} relative`}>
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          {isOrg && <div className="absolute top-4 right-8 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md text-[10px] font-black uppercase text-white tracking-widest shadow-xl">Hồ sơ Tổ chức</div>}
        </div>

        <div className="px-6 pb-8">
          <div className="relative -mt-16 mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center md:items-end space-y-3 md:space-y-0 md:space-x-6">
              <img src={getAvatar(targetUser.avatar, targetUser.name, targetUser.userType)} className={`w-32 h-32 ${isOrg ? 'rounded-[3.5rem]' : 'rounded-[2.5rem]'} border-4 border-white object-cover shadow-2xl bg-white transition-all`} alt="" />
              <div className="text-center md:text-left pb-2">
                <h1 className="text-2xl font-black text-emerald-950 italic uppercase tracking-tighter mb-1 flex items-center justify-center md:justify-start gap-2">
                  {targetUser.name}
                  {isOrg && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                </h1>
                <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                   <span className={`${isOrg ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'} px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border`}>{isOrg ? 'Tổ chức Đồng hành' : 'Thành viên'}</span>
                   <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-gray-100">{(targetUser.friends || []).length} Đồng đội</span>
                   <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-100">{givenItems.length} Đã tặng</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap bg-gray-100 p-1 rounded-2xl shadow-inner gap-1">
               <button onClick={() => setActiveTab('posts')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'posts' ? 'bg-white text-emerald-900 shadow-sm' : 'text-gray-400'}`}>Hoạt động</button>
               {isViewingSelf && (
                 <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'requests' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-400'}`}>
                   Lời mời {allIncomingRequests.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                 </button>
               )}
               <button onClick={() => setActiveTab('friends')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'friends' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}>Đồng đội</button>
               <button onClick={() => setActiveTab('given')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'given' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-400'}`}>Đã tặng</button>
               <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'bg-white text-emerald-900 shadow-sm' : 'text-gray-400'}`}>Thông tin</button>
            </div>
          </div>

          {!isViewingSelf && (
            <div className="flex gap-3 mb-8">
               {targetUser.friends?.includes(user.id) ? (
                 <button onClick={removeFriend} className="flex-1 py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg bg-red-50 text-red-500 border border-red-100">Hủy đồng đội</button>
               ) : requestSent ? (
                 <button onClick={() => cancelRequest(requestSent.id)} className="flex-1 py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">Chờ phản hồi...</button>
               ) : (
                 <button onClick={sendRequest} className={`flex-1 py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg ${isOrg ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>Kết nối đồng đội</button>
               )}
               <button onClick={() => onGoToMessages?.(targetUser.id)} className="flex-1 bg-gray-900 text-white py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-emerald-700 transition-all">Gửi lời nhắn</button>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="animate-in fade-in duration-400 space-y-4">
               {isEditing ? (
                 <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <input className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 font-bold outline-none text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Tên hiển thị" />
                    {user.userType === 'organization' && <input className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 font-bold outline-none text-sm" value={formData.organizationName} onChange={e => setFormData({...formData, organizationName: e.target.value})} placeholder="Tên tổ chức chính xác" />}
                    <textarea className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 font-medium italic outline-none text-sm" rows={3} value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Giới thiệu về bạn/tổ chức..." />
                    <div className="flex justify-end gap-2">
                       <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2 text-[9px] font-black uppercase text-gray-400">Hủy</button>
                       <button type="submit" className="bg-emerald-600 text-white px-7 py-3 rounded-2xl font-black uppercase text-[9px] shadow-lg">Lưu hồ sơ</button>
                    </div>
                 </form>
               ) : (
                 <div className={`${isOrg ? 'bg-blue-50/20 border-blue-50' : 'bg-emerald-50/20 border-emerald-50'} p-8 rounded-[3rem] border shadow-inner`}>
                    <h3 className={`text-[9px] font-black uppercase ${isOrg ? 'text-blue-700' : 'text-emerald-700'} tracking-[0.2em] mb-4`}>{isOrg ? 'Sứ mệnh Tổ chức' : 'Lời ngỏ của Đệ'}</h3>
                    <p className="italic text-gray-700 leading-relaxed text-base font-medium">"{targetUser.bio || (isOrg ? "Chào bạn, chúng tôi là tổ chức thiện nguyện đồng hành cùng GIVEBACK." : "Chào bạn, mình là thành viên tích cực của cộng đồng GIVEBACK.")}"</p>
                    {targetUser.organizationName && isOrg && (
                      <div className="mt-6 flex items-center space-x-3 text-blue-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest">{targetUser.organizationName}</span>
                      </div>
                    )}
                    {isViewingSelf && (
                      <button onClick={() => setIsEditing(true)} className={`mt-8 ${isOrg ? 'bg-blue-900' : 'bg-emerald-950'} text-white px-8 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl`}>Sửa thông tin</button>
                    )}
                 </div>
               )}
            </div>
          )}
          
          {/* Các tab khác giữ nguyên logic nhưng có thể tinh chỉnh UI nhẹ */}
          {activeTab === 'posts' && (
            <div className="space-y-6 animate-in fade-in duration-400">
               {userPosts.map(post => (
                 <div key={post.id} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm flex flex-col p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3 mb-4">
                       <img src={getAvatar(post.authorAvatar, post.authorName, targetUser.userType)} className="w-10 h-10 rounded-2xl object-cover" alt="" />
                       <div><h4 className="font-black text-xs text-gray-900 uppercase italic tracking-tighter">{post.authorName}</h4><p className="text-[7px] text-gray-400 font-bold uppercase">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p></div>
                    </div>
                    <p className="text-sm text-gray-700 italic font-medium mb-4 leading-relaxed">"{post.content}"</p>
                    <PostMediaGrid media={post.media} mediaUrl={post.mediaUrl} mediaType={post.mediaType} />
                 </div>
               ))}
               {userPosts.length === 0 && <p className="text-center py-24 text-[9px] font-black text-gray-300 uppercase italic tracking-[0.2em]">Chưa có hành trình nào được chia sẻ...</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
