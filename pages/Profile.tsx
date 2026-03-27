
import React, { useState, useEffect } from 'react';
import { User, SocialPost, DonationItem, ClaimRecord } from '../types';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db } from '../services/firebase';
import ItemCard from '../components/ItemCard';
import { uploadFile } from '../services/storageService';

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

  if (score >= 70) {
    return { score, label: 'Đề cử ưu tiên', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: '🏅', desc: `Tài khoản uy tín. Tỷ lệ Xin/Tặng rất tốt (Đã tặng ${donated} món, nhận ${received} món).` };
  } else if (score >= 40) {
    return { score, label: 'Bình thường', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: '⚖️', desc: `Tài khoản tiêu chuẩn. Hoạt động bình thường (Đã tặng ${donated} món, nhận ${received} món).` };
  } else {
    return { score, label: 'Cảnh báo thu gom', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: '⚠️', desc: `Nguy cơ gom hàng! Cần xác minh (Đã nhận ${received} món nhưng chỉ tặng ${donated} món).` };
  }
};

interface ProfileProps {
  user: User;
  viewingUserId?: string;
  onUpdateUser: (user: User) => void;
  onNotify: (type: string, message: string) => void;
  onConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info') => void;
  onGoToMessages: () => void;
  onViewProfile: (userId: string) => void;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, viewingUserId, onUpdateUser, onNotify, onConfirm, onGoToMessages, onViewProfile, onLogout }) => {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [receivedItems, setReceivedItems] = useState<ClaimRecord[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'donations' | 'received' | 'friends'>('posts');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');

  const targetUserId = viewingUserId || user.id;
  const isOwnProfile = targetUserId === user.id;

  useEffect(() => {
    const fetchProfile = async () => {
      const userDoc = await getDoc(doc(db, "users", targetUserId));
      if (userDoc.exists()) {
        setProfileUser({ id: userDoc.id, ...userDoc.data() } as User);
        setNewBio(userDoc.data().bio || '');
      }
    };
    fetchProfile();
  }, [targetUserId]);

  useEffect(() => {
    if (!profileUser) return;

    const postsQ = query(collection(db, "social_posts"), where("authorId", "==", profileUser.id));
    const donationsQ = query(collection(db, "items"), where("authorId", "==", profileUser.id));
    const receivedQ = query(collection(db, "claims"), where("receiverId", "==", profileUser.id));

    const unsubPosts = onSnapshot(postsQ, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as SocialPost)));
    });

    const unsubDonations = onSnapshot(donationsQ, (snap) => {
      setDonations(snap.docs.map(d => ({ id: d.id, ...d.data() } as DonationItem)));
    });

    const unsubReceived = onSnapshot(receivedQ, (snap) => {
      setReceivedItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClaimRecord)));
    });

    return () => {
      unsubPosts();
      unsubDonations();
      unsubReceived();
    };
  }, [profileUser]);

  useEffect(() => {
    if (!profileUser?.friends || profileUser.friends.length === 0) {
      setFriends([]);
      return;
    }

    const unsubFriends = onSnapshot(collection(db, "users"), (snap) => {
      const friendData = snap.docs
        .filter(d => profileUser.friends?.includes(d.id))
        .map(d => ({ id: d.id, ...d.data() } as User));
      setFriends(friendData);
    });

    return () => unsubFriends();
  }, [profileUser?.friends]);

  const handleUpdateBio = async () => {
    try {
      await updateDoc(doc(db, "users", user.id), { bio: newBio });
      setIsEditingBio(false);
      onNotify('success', "Đã cập nhật tiểu sử!");
    } catch (err) {
      onNotify('error', "Có lỗi xảy ra.");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      onNotify('info', "Đang tải ảnh đại diện lên...");
      const url = await uploadFile(file, 'avatars');
      await updateDoc(doc(db, "users", user.id), { avatar: url });
      onNotify('success', "Đã cập nhật ảnh đại diện!");
    } catch (err) {
      onNotify('error', "Không thể tải ảnh lên.");
    }
  };

  const handleFriendAction = async () => {
    if (!profileUser) return;
    const isFriend = user.friends?.includes(profileUser.id);
    
    try {
      if (isFriend) {
        await updateDoc(doc(db, "users", user.id), { friends: arrayRemove(profileUser.id) });
        await updateDoc(doc(db, "users", profileUser.id), { friends: arrayRemove(user.id) });
        onNotify('info', "Đã hủy kết bạn.");
      } else {
        await updateDoc(doc(db, "users", user.id), { friends: arrayUnion(profileUser.id) });
        await updateDoc(doc(db, "users", profileUser.id), { friends: arrayUnion(user.id) });
        onNotify('success', "Đã gửi lời mời kết bạn!");
      }
    } catch (err) {
      onNotify('error', "Có lỗi xảy ra.");
    }
  };

  if (!profileUser) return <div className="pt-32 text-center text-gray-500 font-black uppercase tracking-widest animate-pulse">Đang tải hồ sơ...</div>;

  const aiData = calculateAITrustScore(donations.length, receivedItems.length);

  return (
    <div className="pt-20 pb-12 px-4 max-w-6xl mx-auto font-['Inter'] bg-[#0d1117] min-h-screen">
      {/* Header Card */}
      <div className="bg-[#161b22] rounded-[3rem] border border-gray-800 shadow-2xl overflow-hidden mb-8">
        <div className="h-48 bg-gradient-to-r from-emerald-900/40 via-[#161b22] to-emerald-900/40 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        </div>
        <div className="px-8 pb-10 -mt-20 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end gap-8">
            <div className="relative group">
              <div className="w-40 h-40 rounded-[2.5rem] bg-[#0d1117] border-8 border-[#161b22] overflow-hidden shadow-2xl">
                <img src={profileUser.avatar || `https://ui-avatars.com/api/?name=${profileUser.name}&background=10b981&color=fff`} className="w-full h-full object-cover" alt="" />
              </div>
              {isOwnProfile && (
                <label className="absolute bottom-2 right-2 bg-emerald-600 p-3 rounded-2xl cursor-pointer hover:bg-emerald-500 transition-all shadow-xl border-4 border-[#161b22]">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-4 mb-2">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-white">{profileUser.name}</h1>
                <span className="bg-emerald-500/10 text-emerald-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                  {profileUser.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                </span>
                <span title={aiData.desc} className={`flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full border flex items-center gap-1.5 cursor-help shadow-lg ${aiData.color}`}>
                  <span className="text-sm">{aiData.icon}</span> {aiData.label}
                </span>
              </div>
              <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-4">Tham gia từ {profileUser.createdAt ? new Date(profileUser.createdAt).toLocaleDateString() : '...'}</p>
              
              <div className="flex flex-wrap gap-8">
                <div className="text-center md:text-left">
                  <p className="text-2xl font-black text-white">{posts.length}</p>
                  <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Bài viết</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-2xl font-black text-white">{donations.length}</p>
                  <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Đã tặng</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-2xl font-black text-white">{receivedItems.length}</p>
                  <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Đã nhận</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-2xl font-black text-white">{friends.length}</p>
                  <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Bạn bè</p>
                </div>
                <div className="text-center md:text-left cursor-help" title={aiData.desc}>
                  <p className={`text-2xl font-black ${aiData.color.split(' ')[0]}`}>{aiData.score}</p>
                  <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Điểm uy tín</p>
                </div>
              </div>
            </div>
            {!isOwnProfile && (
              <button 
                onClick={handleFriendAction}
                className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl ${user.friends?.includes(profileUser.id) ? 'bg-gray-800 text-white hover:bg-red-600' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
              >
                {user.friends?.includes(profileUser.id) ? 'Hủy kết bạn' : 'Thêm bạn bè'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bio Section */}
      <div className="bg-[#161b22] rounded-[2.5rem] p-8 border border-gray-800 shadow-xl mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Tiểu sử cá nhân</h3>
          {isOwnProfile && (
            <button onClick={() => setIsEditingBio(!isEditingBio)} className="text-gray-500 hover:text-emerald-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
          )}
        </div>
        {isEditingBio ? (
          <div className="space-y-4">
            <textarea className="w-full bg-[#0d1117] border border-gray-800 rounded-2xl p-6 text-gray-200 text-sm outline-none focus:border-emerald-500 transition-all resize-none" rows={3} value={newBio} onChange={e => setNewBio(e.target.value)} />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsEditingBio(false)} className="px-6 py-2 rounded-xl text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors">Hủy</button>
              <button onClick={handleUpdateBio} className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20">Lưu thay đổi</button>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm leading-relaxed italic">"{profileUser.bio || 'Chưa có tiểu sử...'}"</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'posts', label: 'Bài viết', icon: '📝' },
          { id: 'donations', label: 'Quà đã tặng', icon: '🎁' },
          { id: 'received', label: 'Quà đã nhận', icon: '💝' },
          { id: 'friends', label: 'Bạn bè', icon: '🤝' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] whitespace-nowrap transition-all border flex items-center gap-3 ${activeTab === tab.id ? 'bg-emerald-600 text-white border-emerald-500 shadow-xl shadow-emerald-900/20' : 'bg-[#161b22] text-gray-500 border-gray-800 hover:border-gray-700'}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-[#161b22] rounded-[3rem] border border-gray-800">
                <p className="text-gray-600 font-black uppercase tracking-widest text-xs">Chưa có bài viết nào</p>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="bg-[#161b22] p-6 rounded-[2.5rem] border border-gray-800 shadow-xl">
                  <p className="text-gray-200 text-sm mb-4 leading-relaxed">{post.content}</p>
                  {post.media && post.media.length > 0 && (
                    <div className="rounded-2xl overflow-hidden mb-4 border border-gray-800">
                      <img src={post.media[0].url} className="w-full h-48 object-cover" alt="" />
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                    <span className="text-[9px] font-black text-gray-600 uppercase">{new Date(post.createdAt).toLocaleDateString()}</span>
                    <div className="flex gap-4">
                      <span className="text-[9px] font-black text-emerald-500 uppercase">{post.likes?.length || 0} Thích</span>
                      <span className="text-[9px] font-black text-emerald-500 uppercase">{post.comments?.length || 0} Bình luận</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'donations' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {donations.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-[#161b22] rounded-[3rem] border border-gray-800">
                <p className="text-gray-600 font-black uppercase tracking-widest text-xs">Chưa có món quà nào được đăng</p>
              </div>
            ) : (
              donations.map(item => (
                <ItemCard key={item.id} item={item} user={user} onNotify={onNotify as any} onViewProfile={onViewProfile} />
              ))
            )}
          </div>
        )}

        {activeTab === 'received' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {receivedItems.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-[#161b22] rounded-[3rem] border border-gray-800">
                <p className="text-gray-600 font-black uppercase tracking-widest text-xs">Chưa nhận món quà nào</p>
              </div>
            ) : (
              receivedItems.map(record => (
                <div key={record.id} className="bg-[#161b22] rounded-3xl border border-gray-800 overflow-hidden shadow-xl group">
                  <div className="h-40 relative">
                    <img src={record.itemImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#161b22] to-transparent"></div>
                    <div className="absolute bottom-4 left-4">
                      <h4 className="text-sm font-bold text-white uppercase tracking-tight">{record.itemTitle}</h4>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-900/40 text-emerald-400 flex items-center justify-center text-[8px] font-black border border-emerald-800/50">
                          {record.donorName.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-[10px] font-bold text-gray-400">Từ: <span className="text-emerald-500">{record.donorName}</span></p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
                      <span className="text-[9px] font-black text-gray-600 uppercase">Ngày nhận:</span>
                      <span className="text-[9px] font-black text-emerald-500 uppercase">{new Date(record.claimedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {friends.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-[#161b22] rounded-[3rem] border border-gray-800">
                <p className="text-gray-600 font-black uppercase tracking-widest text-xs">Chưa có bạn bè nào</p>
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend.id} onClick={() => onViewProfile(friend.id)} className="bg-[#161b22] p-4 rounded-3xl border border-gray-800 flex items-center gap-4 cursor-pointer hover:border-emerald-500/50 transition-all group shadow-xl">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-gray-800 group-hover:border-emerald-500 transition-all">
                    <img src={friend.avatar || `https://ui-avatars.com/api/?name=${friend.name}&background=10b981&color=fff`} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">{friend.name}</h4>
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{friend.role === 'admin' ? 'Quản trị' : 'Thành viên'}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
