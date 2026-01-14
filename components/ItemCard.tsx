
import React from 'react';
import { DonationItem, User } from '../types';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface ItemCardProps {
  item: DonationItem;
  user?: User | null;
  onSelect?: (item: DonationItem) => void;
  onNotify?: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, user, onSelect, onNotify }) => {
  const isOutOfStock = item.quantity <= 0;
  const isAdmin = user?.role === 'admin';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Bạn có chắc muốn gỡ bài "${item.title}" không?`)) {
      try {
        await deleteDoc(doc(db, "items", item.id));
        if (onNotify) onNotify('success', `Đã gỡ bài thành công.`, 'Quản trị');
      } catch (err) {
        if (onNotify) onNotify('error', "Có lỗi xảy ra.", 'Hệ thống');
      }
    }
  };

  return (
    <div 
      onClick={() => onSelect?.(item)}
      className={`bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group relative flex flex-col h-full ${isOutOfStock ? 'opacity-80' : ''}`}
    >
      {isAdmin && (
        <button onClick={handleDelete} className="absolute top-4 left-4 z-20 bg-red-500 text-white p-2.5 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
        </button>
      )}

      <div className="relative h-56 bg-gray-100 overflow-hidden">
        <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <div className="bg-emerald-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg italic">
            {item.category}
          </div>
        </div>
        
        {/* Smart Badges hiển thị thông số AI quét được */}
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
          {(item.minAge !== undefined && item.minAge > 0) && (
            <div className="bg-white/90 backdrop-blur-md text-emerald-900 text-[8px] font-black uppercase px-3 py-1.5 rounded-lg shadow-sm">
              🍼 {item.minAge}-{item.maxAge} Tuổi
            </div>
          )}
          {item.bookAuthor && (
            <div className="bg-white/90 backdrop-blur-md text-emerald-900 text-[8px] font-black uppercase px-3 py-1.5 rounded-lg shadow-sm truncate max-w-[120px]">
              ✍️ {item.bookAuthor}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-lg font-black uppercase italic tracking-tighter mb-2 truncate text-gray-950 group-hover:text-emerald-700">
          {item.title}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-6 h-9 italic font-medium leading-relaxed">
          "{item.description || 'Không có mô tả.'}"
        </p>
        
        <div className="mt-auto pt-5 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-black text-[10px]">
              {item.author.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-tighter truncate max-w-[80px]">{item.author}</p>
              <p className="text-[8px] text-gray-400 font-bold uppercase truncate">{item.location || 'Toàn quốc'}</p>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect?.(item); }}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
          >
            LIÊN HỆ
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
