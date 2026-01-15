
import React, { useState, useEffect } from 'react';
import { AuctionItem, User } from '../types';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  addDoc,
  runTransaction
} from "firebase/firestore";
import { db } from '../services/firebase';

interface AuctionProps {
  user: User;
  setActiveTab?: (tab: any) => void;
  onNotify: (type: any, message: string, sender?: string) => void;
}

const Auction: React.FC<AuctionProps> = ({ user, setActiveTab, onNotify }) => {
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<AuctionItem | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "auctions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAuctions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuctionItem)));
    });
    return () => unsubscribe();
  }, []);

  const handleBid = async (auction: AuctionItem) => {
    if (bidAmount <= auction.currentBid) {
      onNotify('warning', `Bạn cần trả giá cao hơn ${(auction.currentBid).toLocaleString()}đ nhé!`, 'Đấu giá');
      return;
    }

    setLoading(true);
    try {
      const auctionRef = doc(db, "auctions", auction.id);
      
      await runTransaction(db, async (transaction) => {
        const auctionDoc = await transaction.get(auctionRef);
        if (!auctionDoc.exists()) throw "Đấu giá không tồn tại!";
        
        const currentData = auctionDoc.data() as AuctionItem;
        if (bidAmount <= currentData.currentBid) throw "Có người vừa trả giá cao hơn rồi!";

        transaction.update(auctionRef, {
          currentBid: bidAmount,
          highestBidderId: user.id,
          highestBidderName: user.name
        });

        const bidRef = collection(db, "auctions", auction.id, "bids");
        await addDoc(bidRef, {
          bidderId: user.id,
          bidderName: user.name,
          amount: bidAmount,
          timestamp: new Date().toISOString()
        });
      });

      onNotify('success', `Chúc mừng! Bạn đang dẫn đầu phiên đấu giá "${auction.title}" với mức giá ${bidAmount.toLocaleString()}đ.`, 'Đấu giá');
      setBidAmount(0);
      setSelectedAuction(null);
    } catch (err: any) {
      onNotify('error', "Lỗi đấu giá: " + String(err), 'Hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeLeft = (endTime: string) => {
    const difference = +new Date(endTime) - +new Date();
    if (difference <= 0) return "Đã kết thúc";
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    
    return `${days}n ${hours}g ${minutes}p`;
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-5xl font-black text-amber-900 dark:text-amber-500 italic uppercase tracking-tighter">Sàn Đấu giá Nhân văn</h1>
        <p className="text-amber-600 font-bold text-[10px] uppercase tracking-[0.4em] mt-4 leading-relaxed">
          Nơi hội tụ những món đồ quý giá được các nhà tài trợ gửi gắm thông qua Admin GIVEBACK. 
          Số tiền thu được sẽ dành trọn cho hoạt động cứu trợ.
        </p>
      </div>

      <div className="mb-16 bg-white dark:bg-slate-900 border-2 border-dashed border-amber-200 dark:border-amber-900 rounded-[3rem] p-8 md:p-12 text-center shadow-sm">
         <div className="bg-amber-100 dark:bg-amber-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.7 6.4L13.6 5.3c-.4-.4-1-.4-1.4 0L2.5 15c-.4.4-.4 1 0 1.4l1.1 1.1c.4.4 1 .4 1.4 0L14.7 7.8c.4-.4.4-1 0-1.4z M16.5 10.3l1.8-1.8c.4-.4.4-1 0-1.4l-3.2-3.2c-.4-.4-1-.4-1.4 0l-1.8 1.8 4.6 4.6z"/>
            </svg>
         </div>
         <h2 className="text-2xl font-black italic uppercase text-amber-900 dark:text-amber-500 mb-4 tracking-tight">Bạn muốn đóng góp vật phẩm đấu giá?</h2>
         <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mb-8 max-w-md mx-auto italic leading-relaxed">Nếu bạn sở hữu món đồ có giá trị và muốn đấu giá để gây quỹ, hãy liên hệ trực tiếp với Admin để được thẩm định và lên sàn nhé!</p>
         <button 
          onClick={() => setActiveTab?.('contact')}
          className="bg-amber-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-amber-100 dark:shadow-none hover:bg-amber-700 active:scale-95 transition-all"
        >
          Liên hệ Admin ngay
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {auctions.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl overflow-hidden border border-amber-50 dark:border-slate-800 group hover:-translate-y-2 transition-all relative">
            <div className="h-72 relative">
              <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              
              <div className="absolute top-6 left-6 flex flex-col space-y-2">
                <span className="bg-amber-500 text-amber-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg italic w-fit">Đã xác thực</span>
                <span className="bg-white/90 text-gray-900 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm w-fit">
                   ⏳ {calculateTimeLeft(item.endTime)}
                </span>
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Dành cho chuyến cứu trợ</p>
                <p className="text-lg font-black text-white italic truncate uppercase tracking-tighter">{item.missionLocation}</p>
              </div>
            </div>

            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black italic uppercase text-gray-900 dark:text-white truncate pr-2">{item.title}</h3>
              </div>
              
              <div className="bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-900 mb-8">
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Giá hiện tại</p>
                      <p className="text-3xl font-black text-amber-900 dark:text-amber-500 tracking-tighter">{item.currentBid.toLocaleString()}đ</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Dẫn đầu</p>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[100px]">{item.highestBidderName || "Chưa có"}</p>
                   </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedAuction(item)}
                className="w-full bg-amber-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-amber-100 dark:shadow-none hover:bg-black active:scale-95 transition-all"
              >
                Đặt giá thầu
              </button>
            </div>
          </div>
        ))}
      </div>

      {auctions.length === 0 && (
        <div className="text-center py-20">
           <div className="w-24 h-24 bg-amber-50 dark:bg-amber-900/20 text-amber-200 dark:text-amber-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2" /></svg>
           </div>
           <p className="text-gray-400 font-black uppercase tracking-[0.4em] italic text-sm">Hiện chưa có phiên đấu giá nào</p>
        </div>
      )}

      {selectedAuction && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-amber-950/80 backdrop-blur-md" onClick={() => setSelectedAuction(null)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-500">
             <div className="h-72 relative">
                <img src={selectedAuction.image} className="w-full h-full object-cover" alt="" />
                <button onClick={() => setSelectedAuction(null)} className="absolute top-8 right-8 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/40 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="absolute bottom-6 left-8">
                   <span className="bg-amber-500 text-amber-950 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl italic">Premium Item</span>
                </div>
             </div>
             <div className="p-10">
                <div className="flex items-center space-x-2 mb-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                   <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Phiên đang diễn ra</span>
                </div>
                <h3 className="text-3xl font-black italic uppercase text-amber-950 dark:text-amber-500 mb-4 tracking-tight">{selectedAuction.title}</h3>
                
                <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-[2.5rem] border border-amber-100 dark:border-amber-900 mb-8 text-center">
                   <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Giá cao nhất hiện tại</p>
                   <p className="text-5xl font-black text-amber-900 dark:text-amber-500 tracking-tighter">{selectedAuction.currentBid.toLocaleString()} VNĐ</p>
                   <div className="mt-4 flex items-center justify-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] font-black text-amber-700 dark:text-amber-300">
                        {(selectedAuction.highestBidderName || "?").charAt(0)}
                      </div>
                      <p className="text-[10px] text-amber-800 dark:text-amber-400 font-bold italic">{selectedAuction.highestBidderName || "Hãy là người đặt giá đầu tiên"}</p>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="relative">
                      <input 
                        type="number" 
                        className="w-full bg-gray-50 dark:bg-slate-800 border-3 border-transparent focus:border-amber-500 rounded-3xl px-8 py-5 outline-none font-black text-2xl text-amber-900 dark:text-white transition-all"
                        placeholder={`Mời trả giá > ${selectedAuction.currentBid}`}
                        value={bidAmount || ''}
                        onChange={e => setBidAmount(parseInt(e.target.value))}
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-gray-300">VNĐ</div>
                   </div>
                   
                   <div className="flex justify-between px-2">
                      {[50000, 100000, 500000].map(val => (
                        <button 
                          key={val}
                          onClick={() => setBidAmount(selectedAuction.currentBid + val)} 
                          className="bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-600 hover:text-white text-amber-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          +{val/1000}k
                        </button>
                      ))}
                   </div>

                   <button 
                    onClick={() => handleBid(selectedAuction)}
                    disabled={loading}
                    className="w-full bg-amber-950 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-amber-100 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Đang gửi...' : 'XÁC NHẬN ĐẶT GIÁ'}
                  </button>
                </div>

                <div className="mt-10 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
                   <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2">Góp sức cho:</p>
                   <p className="text-xs font-black text-amber-900 dark:text-amber-500 italic uppercase">{selectedAuction.missionLocation}</p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auction;
