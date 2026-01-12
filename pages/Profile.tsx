
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
      return (
        <video key={index} src={item.url} controls className={`w-full h-full object-cover ${className}`} />
      );
    }
    return (
      <img key={index} src={item.url} className={`w-full h-full object-cover ${className}`} alt="" />
    );
  };

  if (media && media.length > 0) {
    const count = media.length;
    return (
      <div className={`grid gap-1 w-full max-h-[450px] overflow-hidden rounded-[1.5rem] my-3 shadow-md border border-gray-100 bg-gray-50
        ${count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2 aspect-video' : count === 3 ? 'grid-cols-2 grid-rows-2 aspect-square' : 'grid-cols-2 grid-rows-2 aspect-square'}`}>
        
        {count === 1 && <div className="w-full">{renderMediaItem(media[0], 0, "max-h-[450px]")}</div>}
        
        {count === 2 && (
          <>
            <div className="h-full">{renderMediaItem(media[0], 0, "")}</div>
            <div className="h-full">{renderMediaItem(media[1], 1, "")}</div>
          </>
        )}

        {count === 3 && (
          <>
            <div className="row-span-2 h-full">{renderMediaItem(media[0], 0, "")}</div>
            <div className="h-full">{renderMediaItem(media[1], 1, "")}</div>
            <div className="h-full">{renderMediaItem(media[2], 2, "")}</div>
          </>
        )}

        {count >= 4 && (
          <>
            <div className="h-full">{renderMediaItem(media[0], 0, "")}</div>
            <div className="h-full">{renderMediaItem(media[1], 1, "")}</div>
            <div className="h-full">{renderMediaItem(media[2], 2, "")}</div>
            <div className="h-full relative">
              {renderMediaItem(media[3], 3, "")}
              {count > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-black text-xl">+{count - 4}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (mediaUrl) {
    return (
      <div className="bg-gray-50 flex items-center justify-center border border-gray-100 rounded-[1.5rem] my-3 shadow-sm overflow-hidden">
        {mediaType === 'video' ? (
          <video src={mediaUrl} controls className="w-full max-h-[400px]" />
        ) : (
          <img src={mediaUrl} className="w-full h-auto object-contain max-h-[450px]" alt="" />
        )}
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
    organization: user.organization || '',
    bio: user.bio || ''
  });

  const getAvatar = (src?: string, name?: string) => {
    if (src && src.trim() !== "") return src;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=059669&color=fff&bold=true`;
  };

  useEffect(() => {
    if (isViewingSelf) {
      setTargetUser(user);
      setFormData({
        name: user.name,
        avatar: user.avatar || '',
        location: user.location || '',
        organization: user.organization || '',
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
    } catch (e) { console.error("Lỗi fetch bạn bè:", e); }
  };

  const sendRequest = async () => {
    if (!targetUser) return;
    try {
      await addDoc(collection(db, "friend_requests"), {
        fromId: user.id,
        fromName: user.name,
        fromAvatar: getAvatar(user.avatar, user.name),
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
      
      if (targetUser.id === friendRef.id) {
        setTargetUser({...targetUser, friends: [...(targetUser.friends || []), user.id]});
      }
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
    if (!window.confirm(`Bạn có chắc muốn hủy kết nối đồng đội với ${targetUser.name}?`)) return;
    try {
      const userRef = doc(db, "users", user.id);
      const friendRef = doc(db, "users", targetUser.id);
      await updateDoc(userRef, { friends: arrayRemove(targetUser.id) });
      await updateDoc(friendRef, { friends: arrayRemove(user.id) });
      onUpdateUser({ ...user, friends: user.friends?.filter(id => id !== targetUser.id) });
      onNotify('info', `Đã hủy kết nối với ${targetUser.name}.`, 'Bạn bè');
      setTargetUser({...targetUser, friends: targetUser.friends?.filter(id => id !== user.id)});
    } catch (e) { onNotify('error', "Thao tác thất bại."); }
  };

  const handleReaction = async (post: SocialPost, type: 'likes' | 'hearts' | 'thanks') => {
    const postRef = doc(db, "social_posts", post.id);
    const list = (post as any)[type] || [];
    const hasReacted = list.includes(user.id);
    try {
      if (hasReacted) { await updateDoc(postRef, { [type]: arrayRemove(user.id) }); }
      else { await updateDoc(postRef, { [type]: arrayUnion(user.id) }); }
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
        authorAvatar: getAvatar(user.avatar, user.name),
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

  return (
    <div className="pt-24 pb-12 px-4 max-w-4xl mx-auto font-['Inter']">
      <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-emerald-50 relative">
        <div className="h-40 bg-gradient-to-r from-emerald-600 to-teal-700 relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>

        <div className="px-6 pb-8">
          <div className="relative -mt-16 mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center md:items-end space-y-3 md:space-y-0 md:space-x-6">
              <img src={getAvatar(targetUser.avatar, targetUser.name)} className="w-32 h-32 rounded-[2.5rem] border-4 border-white object-cover shadow-2xl bg-white" alt="" />
              <div className="text-center md:text-left pb-2">
                <h1 className="text-2xl font-black text-emerald-950 italic uppercase tracking-tighter mb-1">{targetUser.name}</h1>
                <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                   <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-100">{targetUser.role}</span>
                   <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-200">{(targetUser.friends || []).length} Đồng đội</span>
                   <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-100">{givenItems.length} Đã tặng</span>
                   <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-100">{receivedClaims.length} Đã nhận</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap bg-gray-100 p-1 rounded-2xl shadow-inner gap-1">
               <button onClick={() => setActiveTab('posts')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'posts' ? 'bg-white text-emerald-900 shadow-sm' : 'text-gray-400'}`}>Hoạt động</button>
               {isViewingSelf && (
                 <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'requests' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-400'}`}>
                   Lời mời
                   {allIncomingRequests.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                 </button>
               )}
               <button onClick={() => setActiveTab('friends')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'friends' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}>Đồng đội</button>
               <button onClick={() => setActiveTab('given')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'given' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-400'}`}>Đồ đã tặng</button>
               <button onClick={() => setActiveTab('received')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'received' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-400'}`}>Đồ đã nhận</button>
               <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'bg-white text-emerald-900 shadow-sm' : 'text-gray-400'}`}>Thông tin</button>
            </div>
          </div>

          {!isViewingSelf && (
            <div className="flex gap-3 mb-8">
               {targetUser.friends?.includes(user.id) ? (
                 <button onClick={removeFriend} className="flex-1 py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg bg-red-50 text-red-500 border border-red-100">Hủy đồng đội</button>
               ) : requestSent ? (
                 <button onClick={() => cancelRequest(requestSent.id)} className="flex-1 py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">Đã gửi (Rút lại?)</button>
               ) : requestReceived ? (
                 <div className="flex-1 flex gap-2">
                    <button onClick={() => acceptRequest()} className="flex-[2] py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg bg-emerald-600 text-white">Chấp nhận đồng đội</button>
                    <button onClick={() => cancelRequest(requestReceived.id)} className="flex-1 py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg bg-gray-100 text-gray-500">Từ chối</button>
                 </div>
               ) : (
                 <button onClick={sendRequest} className="flex-1 py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg bg-emerald-600 text-white">Gửi lời mời kết nối</button>
               )}
               <button onClick={() => onGoToMessages?.(targetUser.id)} className="flex-1 bg-gray-900 text-white py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-emerald-700 transition-all">Gửi lời nhắn</button>
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="space-y-4 animate-in fade-in duration-400">
               {userPosts.map(post => (
                 <div key={post.id} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm flex flex-col p-5">
                    <div className="flex items-center space-x-3 mb-4">
                       <img src={getAvatar(post.authorAvatar, post.authorName)} className="w-8 h-8 rounded-xl object-cover" alt="" />
                       <div><h4 className="font-black text-xs text-gray-900 uppercase italic tracking-tighter">{post.authorName}</h4><p className="text-[7px] text-gray-400 font-bold uppercase">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p></div>
                    </div>
                    <p className="text-xs text-gray-700 italic font-medium mb-3 leading-relaxed">"{post.content}"</p>
                    
                    <PostMediaGrid media={post.media} mediaUrl={post.mediaUrl} mediaType={post.mediaType} />

                    <div className="p-1.5 flex items-center border-t border-gray-50 space-x-1 mt-2">
                      <button onClick={() => handleReaction(post, 'likes')} className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${post.likes.includes(user.id) ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                        <span className="text-xs">👍</span>
                        <span className="text-[6px] font-black uppercase mt-0.5">{post.likes.length} Thích</span>
                      </button>
                      <button onClick={() => handleReaction(post, 'hearts')} className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${post.hearts?.includes(user.id) ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                        <span className="text-xs">❤️</span>
                        <span className="text-[6px] font-black uppercase mt-0.5">{(post.hearts || []).length} Thương</span>
                      </button>
                      <button onClick={() => setActiveCommentId(activeCommentId === post.id ? null : post.id)} className="flex-1 flex flex-col items-center py-2 rounded-xl text-gray-400 hover:bg-gray-50 transition-all">
                        <span className="text-xs">💬</span>
                        <span className="text-[6px] font-black uppercase mt-0.5">{post.comments?.length || 0} Nhắn gửi</span>
                      </button>
                    </div>

                    {activeCommentId === post.id && (
                      <div className="bg-gray-50/50 p-4 space-y-3 animate-in fade-in duration-300 rounded-2xl mt-2">
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                          {post.comments?.map(comment => (
                            <div key={comment.id} className="flex space-x-2">
                              <img src={getAvatar(comment.authorAvatar, comment.authorName)} className="w-6 h-6 rounded-lg object-cover" alt="" />
                              <div className="flex-1 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-[8px] font-black uppercase italic text-gray-900 leading-none mb-1">{comment.authorName}</p>
                                <p className="text-[10px] text-gray-700 italic leading-snug">"{comment.text}"</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <input 
                            type="text" 
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                            placeholder="Gửi lời nhắn..."
                            className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-emerald-500 shadow-inner"
                          />
                          <button onClick={() => handleAddComment(post.id)} className="bg-emerald-600 text-white p-2 rounded-xl shadow-md transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        </div>
                      </div>
                    )}
                 </div>
               ))}
               {userPosts.length === 0 && <p className="text-center py-20 text-[9px] font-black text-gray-300 uppercase italic">Chưa có bài viết nào...</p>}
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-400">
               {friendsList.map(friend => (
                 <div 
                  key={friend.id} 
                  onClick={() => viewingUserId ? (window.location.href = `/?userId=${friend.id}`) : fetchTargetUser(friend.id)}
                  className="bg-white border border-emerald-50 p-4 rounded-[2rem] flex items-center space-x-4 cursor-pointer hover:bg-emerald-50/50 transition-all shadow-sm"
                 >
                    <img src={getAvatar(friend.avatar, friend.name)} className="w-12 h-12 rounded-2xl object-cover shadow-sm" alt="" />
                    <div className="min-w-0">
                       <p className="font-black text-xs text-emerald-950 uppercase italic tracking-tighter truncate">{friend.name}</p>
                       <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest">Đồng đội GIVEBACK</p>
                    </div>
                 </div>
               ))}
               {(targetUser.friends || []).length === 0 && <p className="col-span-full text-center py-20 text-[9px] font-black text-gray-300 uppercase italic">Chưa có đồng đội nào kết nối...</p>}
            </div>
          )}

          {activeTab === 'requests' && isViewingSelf && (
            <div className="space-y-4 animate-in fade-in duration-400">
               <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Lời mời kết nối đang chờ</h3>
               {allIncomingRequests.map(req => (
                 <div key={req.id} className="bg-white border border-emerald-50 p-5 rounded-[2.5rem] flex items-center justify-between shadow-sm">
                   <div className="flex items-center space-x-4">
                      <img src={req.fromAvatar} className="w-12 h-12 rounded-2xl object-cover shadow-sm" alt="" />
                      <div>
                        <p className="font-black text-xs text-emerald-950 uppercase italic tracking-tighter">{req.fromName}</p>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Đã gửi vào {new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => acceptRequest(req)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Đồng ý</button>
                      <button onClick={() => cancelRequest(req.id)} className="bg-gray-100 text-gray-500 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest">Từ chối</button>
                   </div>
                 </div>
               ))}
               {allIncomingRequests.length === 0 && (
                 <div className="text-center py-20 text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    <p className="text-[9px] font-black uppercase italic">Hiện tại đệ không có lời mời nào mới.</p>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'given' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-400">
               {givenItems.map(item => (
                 <div key={item.id} className="bg-amber-50/30 border border-amber-100 p-4 rounded-[2rem] flex items-center space-x-4">
                    <img src={item.image} className="w-16 h-16 rounded-2xl object-cover shadow-md" alt="" />
                    <div className="min-w-0">
                       <p className="font-black text-[11px] text-amber-950 uppercase italic tracking-tighter truncate">{item.title}</p>
                       <p className="text-[7px] text-amber-600 font-bold uppercase mt-1 tracking-widest">Đã tặng cộng đồng</p>
                       <p className="text-[7px] text-gray-400 font-bold mt-1 uppercase italic">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                 </div>
               ))}
               {givenItems.length === 0 && <p className="col-span-full text-center py-20 text-[9px] font-black text-gray-300 uppercase italic">Đệ chưa tặng món đồ nào...</p>}
            </div>
          )}

          {activeTab === 'received' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-400">
               {receivedClaims.map(claim => (
                 <div key={claim.id} className="bg-blue-50/30 border border-blue-100 p-4 rounded-[2rem] flex items-center space-x-4">
                    <img src={claim.itemImage} className="w-16 h-16 rounded-2xl object-cover shadow-md" alt="" />
                    <div className="min-w-0">
                       <p className="font-black text-[11px] text-blue-950 uppercase italic tracking-tighter truncate">{claim.itemTitle}</p>
                       <p className="text-[7px] text-blue-600 font-bold mt-1 tracking-widest uppercase">Nhận từ: {claim.donorName}</p>
                       <p className="text-[7px] text-gray-400 font-bold mt-1 uppercase italic">{new Date(claim.createdAt).toLocaleDateString()}</p>
                    </div>
                 </div>
               ))}
               {receivedClaims.length === 0 && <p className="col-span-full text-center py-20 text-[9px] font-black text-gray-300 uppercase italic">Đệ chưa nhận món đồ nào...</p>}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="animate-in fade-in duration-400 space-y-4">
               {isEditing ? (
                 <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <input className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 font-bold outline-none text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Tên hiển thị" />
                    <textarea className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 font-medium italic outline-none text-sm" rows={3} value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Lời ngỏ của Đệ..." />
                    <div className="flex justify-end gap-2">
                       <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2 text-[9px] font-black uppercase text-gray-400">Hủy</button>
                       <button type="submit" className="bg-emerald-600 text-white px-7 py-3 rounded-2xl font-black uppercase text-[9px] shadow-lg">Lưu lại</button>
                    </div>
                 </form>
               ) : (
                 <div className="bg-emerald-50/20 p-6 rounded-[2rem] border border-emerald-50">
                    <h3 className="text-[9px] font-black uppercase text-emerald-700 tracking-[0.2em] mb-2">Lời ngỏ</h3>
                    <p className="italic text-gray-700 leading-relaxed text-base font-medium">"{targetUser.bio || "Người đồng đội này đang tích cực sẻ chia..."}"</p>
                    {isViewingSelf && (
                      <button onClick={() => setIsEditing(true)} className="mt-6 bg-emerald-950 text-white px-7 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg">Sửa thông tin</button>
                    )}
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
