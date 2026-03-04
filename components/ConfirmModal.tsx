
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "XÁC NHẬN",
  cancelText = "HỦY BỎ",
  type = 'info'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white dark:bg-slate-900 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl border-4 border-gray-50 dark:border-slate-800"
          >
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 mx-auto
              ${type === 'danger' ? 'bg-red-50 text-red-500' : ''}
              ${type === 'warning' ? 'bg-amber-50 text-amber-500' : ''}
              ${type === 'info' ? 'bg-emerald-50 text-emerald-500' : ''}
            `}>
              {type === 'danger' && <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
              {type === 'warning' && <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
              {type === 'info' && <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            </div>

            <h3 className="text-lg font-black uppercase text-gray-900 dark:text-white text-center mb-2 tracking-tight">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8 font-medium leading-relaxed">{message}</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { onConfirm(); onCancel(); }}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95
                  ${type === 'danger' ? 'bg-red-500 text-white hover:bg-red-600' : ''}
                  ${type === 'warning' ? 'bg-amber-500 text-white hover:bg-amber-600' : ''}
                  ${type === 'info' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                `}
              >
                {confirmText}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
