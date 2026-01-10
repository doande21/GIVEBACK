
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface ProfileProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: user.name,
    avatar: user.avatar || '',
    location: user.location || '',
    organization: user.organization || '',
    bio: user.bio || ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData({
      name: user.name,
      avatar: user.avatar || '',
      location: user.location || '',
      organization: user.organization || '',
      bio: user.bio || ''
    });
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, formData);
      onUpdateUser({ ...user, ...formData });
      setIsEditing(false);
      alert("Đã cập nhật hồ sơ thành công!");
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-5xl mx-auto">
      <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-emerald-50 relative">
        {/* Banner Area */}
        <div className="h-48 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>

        {/* Profile Info Section */}
        <div className="px-8 pb-12">
          <div className="relative -mt-20 mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-8">
              <div className="relative group">
                <img 
                  src={formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=059669&color=fff`} 
                  className={`w-40 h-40 rounded-[2.5rem] border-8 border-white object-cover shadow-2xl transition-all ${isEditing ? 'cursor-pointer hover:brightness-75' : ''}`}
                  alt={user.name}
                  onClick={() => isEditing && fileInputRef.current?.click()}
                />
                
                {isEditing && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center rounded-[2.5rem] bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer pointer-events-none md:pointer-events-auto"
                  >
                    <div className="bg-white/90 p-3 rounded-full shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
                
                <div className="absolute inset-0 rounded-[2.5rem] ring-4 ring-emerald-500/20 pointer-events-none"></div>
              </div>
              
              <div className="text-center md:text-left pb-4">
                <h1 className="text-4xl font-black text-emerald-900 italic tracking-tighter uppercase mb-2">
                  {isEditing ? (formData.name || user.name) : user.name}
                </h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                    {user.role === 'admin' ? 'Quản trị viên' : 'Thành viên nhiệt huyết'}
                  </span>
                  {(isEditing ? formData.location : user.location) && (
                    <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {isEditing ? formData.location : user.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-gray-900 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95"
              >
                Chỉnh sửa hồ sơ
              </button>
            )}
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.3em] mb-4 flex items-center">
                    <span className="w-8 h-[2px] bg-emerald-500 mr-2"></span>
                    Lời giới thiệu
                  </h3>
                  <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-emerald-50 italic text-gray-600 leading-relaxed text-lg">
                    "{user.bio || "Thành viên này rất tích cực nhưng chưa kịp viết lời giới thiệu..."}"
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-[2rem] border border-emerald-50 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nơi sinh sống</p>
                    <p className="text-lg font-bold text-emerald-900">{user.location || "Chưa cập nhật"}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-emerald-50 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tổ chức / Đội nhóm</p>
                    <p className="text-lg font-bold text-emerald-900">{user.organization || "Cá nhân tự do"}</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-emerald-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors"></div>
                  <h4 className="text-xs font-black uppercase tracking-widest mb-8 text-emerald-200">Thống kê GIVEBACK</h4>
                  <div className="space-y-6">
                    <div>
                      <p className="text-3xl font-black italic tracking-tighter">100%</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Tinh thần tự nguyện</p>
                    </div>
                    <div className="pt-6 border-t border-white/10">
                      <p className="text-xl font-black italic tracking-tighter">Thành viên</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Loại tài khoản</p>
                    </div>
                    <div className="pt-6 border-t border-white/10">
                      <p className="text-xl font-black italic tracking-tighter">Bền vững</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Cam kết cộng đồng</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Họ và Tên</label>
                    <input required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-gray-700" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  
                  <div className="p-6 bg-emerald-50/50 rounded-2xl border-2 border-dashed border-emerald-100 flex flex-col items-center">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Ảnh đại diện từ thiết bị</p>
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                    >
                      Chọn file ảnh
                    </button>
                    <p className="text-[8px] text-gray-400 mt-2 italic uppercase">Dung lượng tối đa: 2MB</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nơi sinh sống</label>
                    <input className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-gray-700" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Vd: Quận 1, TP.HCM" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tổ chức / Đội nhóm</label>
                    <input className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-gray-700" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} placeholder="Vd: CLB Thiện nguyện ABC" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Giới thiệu ngắn</label>
                    <textarea rows={6} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-gray-700" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Hãy kể một chút về đam mê thiện nguyện của bạn..." />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-4 pt-8 border-t">
                <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600">Hủy bỏ</button>
                <button type="submit" disabled={loading} className="bg-emerald-600 text-white px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all">
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
