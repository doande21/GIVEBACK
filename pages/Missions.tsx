
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

  useEffect(() => {
    const q = query(collection(db, "missions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharityMission)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="pt-24 pb-20 px-4 max-w-6xl mx-auto min-h-screen font-['Plus_Jakarta_Sans']">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black text-emerald-950 uppercase tracking-tighter italic">Hành trình Sứ mệnh</h1>
        <p className="text-emerald-600 font-black text-[10px] uppercase tracking-[0.4em] mt-2">Nơi những trái tim chung nhịp đập</p>
      </div>

      {loading ? (
        <div className="py-20 text-center"><div className="animate-spin h-8 w-8 border-t-2 border-emerald-600 rounded-full mx-auto"></div></div>
      ) : missions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {missions.map(m => {
            const progress = Math.min(100, Math.round((m.currentBudget / m.targetBudget) * 100));
            return (
              <div key={m.id} className="bg-white rounded-[3.5rem] shadow-xl border border-gray-100 overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                <div className="h-64 relative">
                  <img src={m.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-6 left-8">
                    <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 mb-2 inline-block">Sứ mệnh tại</span>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{m.location}</h3>
                  </div>
                </div>
                <div className="p-8">
                  <p className="text-gray-500 text-sm font-medium mb-6 line-clamp-2 italic leading-relaxed">"{m.description}"</p>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase text-emerald-600">Tiến độ quyên góp</span>
                      <span className="text-xl font-black text-emerald-950 italic">{progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5">
                      <div className="h-full bg-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setActiveTab('contact')} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-50 hover:bg-emerald-700 transition-all">Góp quỹ ngay</button>
                    <button className="px-6 py-4 rounded-2xl border-2 border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">Chi tiết</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 text-gray-300 font-black uppercase italic tracking-widest">Đang chuẩn bị các sứ mệnh tiếp theo...</div>
      )}
    </div>
  );
};

export default Missions;
