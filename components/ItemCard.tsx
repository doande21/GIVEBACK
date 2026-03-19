
import React from 'react';
import { DonationItem, User } from '../types';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface ItemCardProps {
  item: DonationItem;
  user?: User | null;
  onSelect?: (item: DonationItem) => void;
  onNotify?: (type: 'success' | 'error' | 'warning' | 'info', message: string, sender?: string) => void;
  onConfirm?: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info') => void;
  onViewProfile?: (userId: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, user, onSelect, onNotify, onConfirm, onViewProfile }) => {
  const isOutOfStock = item.quantity <= 0;
  const isAdmin = user?.role === 'admin';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const performDelete = async () => {
      try {
        await deleteDoc(doc(db, "items", item.id));
        if (onNotify) onNotify('success', `Đã gỡ bài thành công.`, 'Quản trị');
      } catch (err) {
        if (onNotify) onNotify('error', "Có lỗi xảy ra.", 'Hệ thống');
      }
    };
    if (onConfirm) {
      onConfirm("Gỡ bài viết", `Bạn có chắc muốn gỡ bài "${item.title}" không?`, performDelete, 'danger');
    } else if (window.confirm(`Bạn có chắc muốn gỡ bài "${item.title}" không?`)) {
      performDelete();
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewProfile && item.authorId) onViewProfile(item.authorId);
  };

  return (
    <div 
      onClick={() => onSelect?.(item)}
      className={`bg-[#151b23] rounded-2xl border border-gray-800/60 overflow-hidden hover:border-emerald-700/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative flex flex-col h-full ${isOutOfStock ? 'opacity-60' : ''}`}
    >
      {isAdmin && (
        <button onClick={handleDelete} className="absolute top-3 left-3 z-20 bg-red-500/90 text-white p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
        </button>
      )}

      <div className="relative h-48 bg-gray-900 overflow-hidden">
        <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#151b23] via-transparent to-transparent"></div>
        <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          <span className="bg-emerald-600/90 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm">{item.category}</span>
          {isOutOfStock && (
            <span className="bg-red-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-lg animate-pulse shadow-lg">HẾT HÀNG</span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {(item.minAge !== undefined && item.minAge > 0) && (
            <span className="bg-black/60 backdrop-blur-sm text-gray-200 text-[8px] font-bold px-2 py-1 rounded-md">🍼 {item.minAge}-{item.maxAge} Tuổi</span>
          )}
          {item.bookAuthor && (
            <span className="bg-black/60 backdrop-blur-sm text-gray-200 text-[8px] font-bold px-2 py-1 rounded-md truncate max-w-[100px]">✍️ {item.bookAuthor}</span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-1 mb-2">
          {[1,2,3,4,5].map(i => (
            <svg key={i} className={`w-3 h-3 ${i <= 4 ? 'text-amber-400' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          ))}
          <span className="text-gray-500 text-[10px] ml-1">4.0</span>
        </div>
        <h3 className="text-sm font-bold text-gray-100 mb-1.5 truncate group-hover:text-emerald-400 transition-colors">{item.title}</h3>
        <p className="text-[11px] text-gray-500 line-clamp-2 mb-4 leading-relaxed flex-1">{item.description || 'Không có mô tả.'}</p>
        
        <div className="pt-3 border-t border-gray-800/60 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer group/author" onClick={handleAuthorClick}>
            <div className="w-7 h-7 rounded-lg bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 flex items-center justify-center font-bold text-[9px] group-hover/author:bg-emerald-600 group-hover/author:text-white transition-all">
              {item.author.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-300 truncate max-w-[70px] group-hover/author:text-emerald-400 transition-colors">{item.author}</p>
              <p className="text-[8px] text-gray-600 truncate">{item.location || 'Toàn quốc'}</p>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect?.(item); }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-[9px] font-bold tracking-wide shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
          >
            xem chi tiết
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
