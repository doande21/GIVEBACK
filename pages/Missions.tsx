
import React, { useState, useEffect } from 'react';
import { CharityMission } from '../types';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

interface MissionsProps {
  setActiveTab: (tab: string) => void;
}

const Missions: React.FC<MissionsProps> = ({ setActiveTab }) => {
  const [missions, setMissions] = useState<CharityMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<CharityMission | null>(null);
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null);

  useEffect(() => {
    const q = query(collection(db, "missions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewingImageIndex !== null && viewingImageIndex > 0) {
      setViewingImageIndex(viewingImageIndex - 1);
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewingImageIndex !== null && selectedMission?.gallery && viewingImageIndex < selectedMission.gallery.length - 1) {
      setViewingImageIndex(viewingImageIndex + 1);
    }
  };

  return (
    <div className="pt-24 pb-20 px-4 max-w-6xl mx-auto min-h-screen font-['Plus_Jakarta_Sans']">
      <div className="text-center mb-16">
        <h1 className="text-6xl font-black text-Klavika-950 dark:text-Klavika-400 uppercase tracking-tighter  leading-none">Hành trình Sứ mệnh</h1>
        <p className="text-Klavika-600 font-black text-[10px] uppercase tracking-[0.5em] mt-3">Mỗi chuyến đi, một linh hồn nhân ái</p>
      </div>

      {loading ? (
        <div className="py-20 text-center"><div className="animate-spin h-12 w-12 border-4 border-Klavika-100 border-t-Klavika-600 rounded-full mx-auto"></div></div>
      ) : missions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {missions.map(m => {
            const progress = Math.min(100, Math.round((m.currentBudget / m.targetBudget) * 100));
            return (
              <div key={m.id} className="bg-white dark:bg-slate-900 rounded-[4rem] shadow-xl border border-gray-50 dark:border-slate-800 overflow-hidden group hover:-translate-y-3 transition-all duration-700">
                <div className="h-72 relative overflow-hidden">
                  <img src={m.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-8 left-10">
                    <span className="bg-white/20 backdrop-blur-md text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 mb-3 inline-block">Sứ mệnh tại</span>
                    <h3 className="text-3xl font-black text-white uppercase  tracking-tighter leading-none">{m.location}</h3>
                  </div>
                </div>
                <div className="p-10">
                  <p className="text-gray-500 dark:text-slate-400 text-base font-medium mb-8 line-clamp-2  leading-relaxed">"{m.description}"</p>
                  
                  <div className="space-y-4 mb-10">
                    <div className="flex justify-between items-end">
                      <span className="text-[11px] font-black uppercase text-Klavika-600 tracking-widest">Tiến độ quyên góp</span>
                      <span className="text-2xl font-black text-Klavika-950 dark:text-white ">{progress}%</span>
                    </div>
                    <div className="w-full h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
                      <div className="h-full bg-Klavika-600 rounded-full transition-all duration-1000 shadow-lg shadow-Klavika-500/50" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setSelectedMission(m)} className="flex-1 bg-Klavika-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-Klavika-100 dark:shadow-none hover:bg-Klavika-700 transition-all">Góp quỹ ngay</button>
                    <button onClick={() => setSelectedMission(m)} className="px-8 py-5 rounded-2xl border-4 border-Klavika-50 dark:border-slate-800 text-Klavika-600 text-[11px] font-black uppercase tracking-widest hover:bg-Klavika-50 transition-all">Chi tiết</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 text-gray-300 font-black uppercase  tracking-[0.5em] text-sm animate-pulse">Đang chuẩn bị các sứ mệnh tiếp theo...</div>
      )}

      {/* Soul of Mission Detail Modal */}
      {selectedMission && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-Klavika-950/90 backdrop-blur-xl" onClick={() => setSelectedMission(null)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[4rem] p-10 md:p-14 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
             <div className="flex justify-between items-center mb-12">
                <div className="flex items-center space-x-5">
                   <div className="w-3 h-12 bg-Klavika-600 rounded-full"></div>
                   <h2 className="text-4xl font-black uppercase  text-Klavika-950 dark:text-Klavika-400 tracking-tighter">Chi tiết Sứ mệnh</h2>
                </div>
                <button onClick={() => setSelectedMission(null)} className="text-gray-300 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                {/* Column 1: Info & Donation */}
                <div className="lg:col-span-2 space-y-8">
                   <div className="rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-Klavika-50">
                      <img src={selectedMission.image} className="w-full h-64 object-cover" alt="" />
                   </div>
                   <div className="bg-Klavika-50/50 dark:bg-Klavika-900/10 p-10 rounded-[3.5rem] border border-Klavika-100 dark:border-Klavika-800">
                      <p className="text-[10px] font-black text-Klavika-600 uppercase tracking-widest mb-3 text-center">Mục tiêu tài chính</p>
                      <p className="text-3xl font-black text-Klavika-950 dark:text-white tracking-tighter text-center">{selectedMission.currentBudget.toLocaleString()} / {selectedMission.targetBudget.toLocaleString()} VNĐ</p>
                      <div className="mt-8 text-center">
                         <p className="text-[9px] font-black text-Klavika-400 uppercase tracking-widest mb-6">Quét mã để quyên góp</p>
                         <div className="bg-white p-6 rounded-[2.5rem] inline-block shadow-xl border-4 border-Klavika-50">
                            <img src={selectedMission.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=DonationFor${selectedMission.location}`} className="w-44 h-44" alt="QR Code" />
                         </div>
                      </div>
                   </div>
                </div>

                {/* Column 2: Items & Gallery */}
                <div className="lg:col-span-3 space-y-12">
                   <div>
                      <h4 className="text-xs font-black uppercase text-Klavika-900 dark:text-Klavika-400 tracking-[0.3em] mb-8 flex items-center gap-3">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                         Nhu yếu phẩm cần thiết
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {selectedMission.itemsNeeded && selectedMission.itemsNeeded.length > 0 ? selectedMission.itemsNeeded.map((item, idx) => {
                            const itemProgress = Math.min(100, Math.round((item.current / item.target) * 100));
                            return (
                               <div key={idx} className="bg-gray-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700 group hover:border-Klavika-500 transition-all">
                                  <div className="flex justify-between items-center mb-3">
                                     <span className="text-sm font-black text-Klavika-950 dark:text-white uppercase tracking-tighter">{item.name}</span>
                                     <span className="text-[10px] font-black text-Klavika-600">{item.current} / {item.target} {item.unit}</span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                     <div className="h-full bg-Klavika-500 transition-all duration-1000" style={{ width: `${itemProgress}%` }}></div>
                                  </div>
                               </div>
                            )
                         }) : (
                            <p className="col-span-full text-gray-400 font-bold  text-sm text-center py-10">Đang cập nhật danh mục nhu yếu phẩm...</p>
                         )}
                      </div>
                   </div>

                   {/* REAL JOURNEY GALLERY SECTION */}
                   <div>
                      <h4 className="text-xs font-black uppercase text-Klavika-900 dark:text-Klavika-400 tracking-[0.3em] mb-8 flex items-center gap-3">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                         Hình ảnh hành trình thực tế
                      </h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                         {selectedMission.gallery && selectedMission.gallery.length > 0 ? selectedMission.gallery.map((img, idx) => (
                            <div 
                              key={idx} 
                              className="aspect-square rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-md group relative"
                              onClick={() => setViewingImageIndex(idx)}
                            >
                               <img src={img} className="w-full h-full object-cover" alt="" />
                               <div className="absolute inset-0 bg-Klavika-600/0 group-hover:bg-Klavika-600/20 transition-colors"></div>
                            </div>
                         )) : (
                            <div className="col-span-full p-10 bg-gray-50 dark:bg-slate-800 rounded-[3rem] border-4 border-dashed border-gray-200 dark:border-slate-700 text-center">
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-loose">Hành trình đang được thực hiện.<br/>Hình ảnh sẽ sớm được cập nhật!</p>
                            </div>
                         )}
                      </div>
                   </div>

                   <div className="p-8 bg-amber-50 dark:bg-amber-900/10 rounded-[2.5rem] border border-amber-100 dark:border-amber-800">
                      <p className="text-[11px] font-black text-amber-700 uppercase leading-relaxed ">"Mỗi tấm hình Đệ thấy là một minh chứng cho tình người rộng mở. Hãy cùng GIVEBACK viết tiếp những câu chuyện đẹp này nhé!"</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN IMAGE VIEWER (LIGHTBOX) WITH NAVIGATION */}
      {viewingImageIndex !== null && selectedMission?.gallery && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setViewingImageIndex(null)}></div>
           
           {/* Top Info & Close */}
           <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center text-white z-20">
              <span className="bg-white/10 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                Ảnh {viewingImageIndex + 1} / {selectedMission.gallery.length}
              </span>
              <button onClick={() => setViewingImageIndex(null)} className="p-3 bg-white/10 hover:bg-red-500 rounded-2xl transition-all backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
           </div>

           {/* Left Navigation Arrow */}
           {viewingImageIndex > 0 && (
             <button 
               onClick={handlePrevImage}
               className="absolute left-4 md:left-10 z-20 p-4 bg-white/10 hover:bg-white text-white hover:text-black rounded-full transition-all backdrop-blur-md group"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
             </button>
           )}

           {/* The Image */}
           <div className="relative max-w-full max-h-full flex items-center justify-center animate-in zoom-in-95 duration-300 px-12">
              <img 
                key={viewingImageIndex} // Key helps React trigger re-animation on index change
                src={selectedMission.gallery[viewingImageIndex]} 
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border-4 border-white/10" 
                alt="Full view" 
              />
           </div>

           {/* Right Navigation Arrow */}
           {viewingImageIndex < selectedMission.gallery.length - 1 && (
             <button 
               onClick={handleNextImage}
               className="absolute right-4 md:right-10 z-20 p-4 bg-white/10 hover:bg-white text-white hover:text-black rounded-full transition-all backdrop-blur-md group"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </button>
           )}

           {/* Bottom Instructions */}
           <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 text-[9px] font-black uppercase tracking-[0.3em] pointer-events-none hidden md:block">
              Nhấn phím mũi tên hoặc nhấn vào nền để thoát
           </div>
        </div>
      )}
    </div>
  );
};

export default Missions;
