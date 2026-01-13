
import React, { useState, useEffect } from 'react';
import { Sponsor, Contribution } from '../types';
import { db } from '../services/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

const Sponsors: React.FC = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [activeType, setActiveType] = useState<'all' | 'organization' | 'individual'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);

  useEffect(() => {
    const sponsorsRef = collection(db, "sponsors");
    const q = query(sponsorsRef);

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const docData = d.data();
        return { 
          id: d.id, 
          ...docData,
          totalMoney: Number(docData.totalMoney) || 0,
          totalItemsCount: Number(docData.totalItemsCount) || 0,
          rank: (docData.rank || 'bronze').toLowerCase(),
          type: docData.type || 'individual',
          name: docData.name || 'Nhà hảo tâm ẩn danh',
          avatar: docData.avatar || '',
          message: docData.message || 'Lan tỏa yêu thương cùng GIVEBACK.',
          history: docData.history || []
        } as Sponsor;
      });
      
      data.sort((a, b) => b.totalMoney - a.totalMoney);
      setSponsors(data);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi Firebase Sponsors:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredSponsors = sponsors.filter(s => {
    if (activeType === 'all') return true;
    return s.type === activeType;
  });

  const getRankStyles = (rank: string, index: number) => {
    if (index === 0) return {
      gradient: 'from-yellow-400 via-amber-500 to-yellow-600',
      shadow: 'shadow-yellow-200',
      badge: '👑',
      label: 'QUÁN QUÂN SẺ CHIA'
    };
    if (index === 1) return {
      gradient: 'from-slate-300 via-gray-400 to-slate-500',
      shadow: 'shadow-gray-200',
      badge: '⭐',
      label: 'NGÔI SAO NHÂN ÁI'
    };
    if (index === 2) return {
      gradient: 'from-orange-400 via-amber-600 to-orange-700',
      shadow: 'shadow-orange-100',
      badge: '❤️',
      label: 'TẤM LÒNG VÀNG'
    };
    
    switch(rank) {
      case 'gold': return { gradient: 'from-amber-400 to-yellow-600', shadow: 'shadow-amber-50', badge: '🏅', label: 'HẠNG VÀNG' };
      case 'silver': return { gradient: 'from-slate-300 to-gray-400', shadow: 'shadow-gray-50', badge: '🥈', label: 'HẠNG BẠC' };
      default: return { gradient: 'from-orange-300 to-amber-700', shadow: 'shadow-orange-50', badge: '🥉', label: 'HẠNG ĐỒNG' };
    }
  };

  const getAvatar = (src?: string, name?: string) => {
    if (!src || src.trim() === "") {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Donor')}&background=059669&color=fff&bold=true`;
    }
    return src;
  };

  return (
    <div className="pt-24 pb-20 px-4 max-w-7xl mx-auto min-h-screen font-['Inter']">
      <div className="text-center mb-20 animate-in fade-in slide-in-from-top-10 duration-1000">
        <div className="inline-block mb-4 p-1 rounded-full bg-gradient-to-r from-yellow-400 via-emerald-500 to-emerald-600">
          <div className="bg-white px-6 py-2 rounded-full">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-600 italic">Hall of Fame</span>
          </div>
        </div>
        <h1 className="text-6xl md:text-8xl font-black text-emerald-950 italic uppercase tracking-tighter leading-none mb-4">Bảng Vàng Tri Ân</h1>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.4em] italic">Nơi lưu giữ những hành trình tử tế</p>
      </div>

      <div className="flex justify-center mb-16">
        <div className="bg-gray-100 p-2 rounded-[3rem] flex shadow-inner overflow-x-auto scrollbar-hide border border-gray-200">
          <button onClick={() => setActiveType('all')} className={`px-10 py-4 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeType === 'all' ? 'bg-white text-emerald-900 shadow-xl scale-105' : 'text-gray-400'}`}>Tất cả</button>
          <button onClick={() => setActiveType('organization')} className={`px-10 py-4 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeType === 'organization' ? 'bg-white text-emerald-900 shadow-xl scale-105' : 'text-gray-400'}`}>Tổ chức</button>
          <button onClick={() => setActiveType('individual')} className={`px-10 py-4 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeType === 'individual' ? 'bg-white text-emerald-900 shadow-xl scale-105' : 'text-gray-400'}`}>Cá nhân</button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
           <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
           <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest animate-pulse italic">Đang mở phong ấn Bảng Vàng...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {filteredSponsors.map((s, index) => {
            const styles = getRankStyles(s.rank, index);
            return (
              <div 
                key={s.id} 
                className={`bg-white rounded-[5rem] p-12 shadow-2xl border border-emerald-50 flex flex-col items-center text-center relative group hover:-translate-y-5 transition-all duration-700 animate-in zoom-in-95 fill-mode-both`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Badge top corner */}
                <div className={`absolute top-10 right-10 w-14 h-14 bg-gradient-to-br ${styles.gradient} rounded-2xl flex items-center justify-center text-2xl shadow-xl border-4 border-white rotate-12 group-hover:rotate-0 transition-transform`}>
                  {styles.badge}
                </div>

                <div className="relative mb-10">
                  <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} rounded-[4rem] blur-2xl opacity-20 group-hover:opacity-50 transition-opacity`}></div>
                  <div className={`p-1 rounded-[4rem] bg-gradient-to-br ${styles.gradient} relative z-10`}>
                    <img 
                      src={getAvatar(s.avatar, s.name)} 
                      className="w-44 h-44 rounded-[3.8rem] object-cover border-8 border-white shadow-2xl bg-white" 
                      alt={s.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=059669&color=fff&bold=true`;
                      }}
                    />
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-3xl font-black text-emerald-950 uppercase italic tracking-tighter mb-2 leading-none group-hover:text-emerald-700 transition-colors">{s.name}</h3>
                  <p className={`text-[9px] font-black uppercase tracking-[0.4em] bg-gradient-to-r ${styles.gradient} bg-clip-text text-transparent italic`}>
                    {styles.label}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mb-10">
                  <div className="bg-gray-50/80 p-5 rounded-[2.5rem] border border-gray-100 group-hover:bg-emerald-50 transition-colors">
                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Cống hiến</p>
                    <p className="text-base font-black text-emerald-950 italic">{(s.totalMoney).toLocaleString()}đ</p>
                  </div>
                  <div className="bg-gray-50/80 p-5 rounded-[2.5rem] border border-gray-100 group-hover:bg-amber-50 transition-colors">
                    <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Hiện vật</p>
                    <p className="text-base font-black text-emerald-950 italic">+{s.totalItemsCount}</p>
                  </div>
                </div>

                <div className="relative mb-12 flex-1 flex items-center">
                  <svg className="absolute -top-4 -left-4 w-8 h-8 text-emerald-100 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21M14.017 21H21.017M14.017 21C12.9124 21 12.017 20.1046 12.017 19V12C12.017 10.8954 12.9124 10 14.017 10H17.017C18.1216 10 19.017 10.8954 19.017 12V14M3 21L3 18C3 16.8954 3.89543 16 5 16H8C9.10457 16 10 16.8954 10 18V21M3 21H10M3 21C1.89543 21 1 20.1046 1 19V12C1 10.8954 1.89543 10 3 10H6C7.10457 10 8 10.8954 8 12V14" /></svg>
                  <p className="text-[13px] text-gray-500 leading-relaxed font-medium italic px-4">"{s.message}"</p>
                </div>
                
                <button 
                  onClick={() => setSelectedSponsor(s)}
                  className={`w-full bg-gradient-to-r ${styles.gradient} p-0.5 rounded-3xl shadow-lg hover:scale-105 active:scale-95 transition-all group/btn`}
                >
                  <div className="bg-white rounded-[1.4rem] py-4 group-hover/btn:bg-transparent transition-colors">
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] bg-gradient-to-r ${styles.gradient} bg-clip-text text-transparent group-hover/btn:text-white`}>
                       {s.type === 'organization' ? 'ĐẠI SỨ CHIẾN DỊCH' : 'CÔNG DÂN TIÊU BIỂU'}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: NHẬT KÝ SẺ CHIA */}
      {selectedSponsor && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xl" onClick={() => setSelectedSponsor(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
             {/* Modal Header */}
             <div className="p-10 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                <div className="flex items-center space-x-5">
                   <img src={getAvatar(selectedSponsor.avatar, selectedSponsor.name)} className="w-16 h-16 rounded-[1.5rem] object-cover shadow-lg border-2 border-white" alt="" />
                   <div>
                      <h2 className="text-xl font-black text-emerald-950 uppercase italic tracking-tighter leading-none">{selectedSponsor.name}</h2>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-2">Hành trình nhân ái</p>
                   </div>
                </div>
                <button onClick={() => setSelectedSponsor(null)} className="p-3 bg-white text-gray-400 hover:text-red-500 rounded-2xl shadow-sm transition-all">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>

             {/* Modal Content */}
             <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4 mb-10">
                   <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 text-center">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Tổng cống hiến</p>
                      <p className="text-2xl font-black text-emerald-900 tracking-tighter">{selectedSponsor.totalMoney.toLocaleString()} VNĐ</p>
                   </div>
                   <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100 text-center">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Tổng hiện vật</p>
                      <p className="text-2xl font-black text-amber-900 tracking-tighter">+{selectedSponsor.totalItemsCount}</p>
                   </div>
                </div>

                <div className="space-y-6 relative">
                   <div className="absolute left-6 top-0 bottom-0 w-px bg-emerald-100"></div>
                   
                   <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                      <span className="w-12 h-px bg-gray-200"></span> Nhật ký sẻ chia
                   </h3>

                   {(selectedSponsor.history && selectedSponsor.history.length > 0) ? selectedSponsor.history.map((h, i) => (
                      <div key={i} className="relative pl-14 animate-in slide-in-from-left-4" style={{ animationDelay: `${i * 100}ms` }}>
                         <div className="absolute left-4 top-2 w-4 h-4 bg-emerald-600 rounded-full border-4 border-white shadow-md"></div>
                         <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                               <h4 className="text-sm font-black text-emerald-950 uppercase italic tracking-tighter">{h.missionName}</h4>
                               <span className="text-[8px] text-gray-400 font-bold uppercase">{new Date(h.date).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                               {h.amount && <span className="text-[9px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-black uppercase tracking-widest">{h.amount.toLocaleString()}đ</span>}
                               {h.items && <span className="text-[9px] bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-black uppercase tracking-widest">{h.items}</span>}
                            </div>
                         </div>
                      </div>
                   )) : (
                      <div className="text-center py-20">
                         <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic leading-loose">
                            Nhà hảo tâm này đã đóng góp trực tiếp<br/>vào các quỹ cứu trợ khẩn cấp của hệ thống.
                         </p>
                      </div>
                   )}
                </div>
             </div>

             <div className="p-10 bg-gray-50/50 border-t border-gray-50 text-center">
                <p className="text-[11px] font-bold text-emerald-900/60 italic leading-relaxed">
                   "Yêu thương cho đi là yêu thương còn mãi.<br/>Cảm ơn bạn đã đồng hành cùng GIVEBACK."
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sponsors;
