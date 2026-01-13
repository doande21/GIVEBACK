
import React, { useState, useEffect } from 'react';
import { User, FriendRequest } from '../types';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../services/firebase';

interface NotificationsProps {
  user: User;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
  onUpdateUser: (updatedUser: User) => void;
  onViewProfile: (userId: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ user, onNotify, onUpdateUser, onViewProfile }) => {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "friend_requests"), 
      where("toId", "==", user.id), 
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.id]);

  const acceptRequest = async (req: FriendRequest) => {
    try {
      const userRef = doc(db, "users", user.id);
      const friendRef = doc(db, "users", req.fromId);
      
      await updateDoc(userRef, { friends: arrayUnion(req.fromId) });
      await updateDoc(friendRef, { friends: arrayUnion(user.id) });
      await deleteDoc(doc(db, "friend_requests", req.id));
      
      onUpdateUser({ ...user, friends: [...(user.friends || []), req.fromId] });
      onNotify('success', `Đã chấp nhận lời mời từ ${req.fromName}!`, 'Bạn bè');
    } catch (e) { 
      onNotify('error', "Thao tác thất bại.", 'Hệ thống'); 
    }
  };

  const rejectRequest = async (reqId: string) => {
    try {
      await deleteDoc(doc(db, "friend_requests", reqId));
      onNotify('info', "Đã từ chối lời mời.", 'Bạn bè');
    } catch (e) { 
      onNotify('error', "Thao tác thất bại.", 'Hệ thống'); 
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-2xl mx-auto min-h-screen font-['Inter']">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-emerald-950 italic uppercase tracking-tighter leading-none">Trung tâm Thông báo</h1>
        <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Kết nối những tấm lòng đồng điệu</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-600"></div></div>
        ) : requests.length > 0 ? (
          requests.map(req => (
            <div key={req.id} className="bg-white border border-emerald-50 p-6 rounded-[2.5rem] flex items-center justify-between shadow-xl animate-in slide-in-from-bottom-2">
              <div className="flex items-center space-x-4">
                <img 
                  src={req.fromAvatar} 
                  className="w-14 h-14 rounded-2xl object-cover shadow-md cursor-pointer hover:scale-105 transition-transform" 
                  alt="" 
                  onClick={() => onViewProfile(req.fromId)}
                />
                <div>
                  <p 
                    className="font-black text-sm text-emerald-950 uppercase italic tracking-tighter cursor-pointer hover:text-emerald-700"
                    onClick={() => onViewProfile(req.fromId)}
                  >
                    {req.fromName}
                  </p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Muốn kết nối đồng đội với bạn</p>
                  <p className="text-[8px] text-gray-300 font-bold uppercase mt-1">{new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button 
                  onClick={() => acceptRequest(req)}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  Đồng ý
                </button>
                <button 
                  onClick={() => rejectRequest(req.id)}
                  className="bg-gray-100 text-gray-500 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                >
                  Từ chối
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-[3rem] p-20 text-center shadow-sm border border-gray-50">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-[10px] font-black uppercase italic text-gray-300 tracking-[0.3em]">Hộp thư thông báo đang trống</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
