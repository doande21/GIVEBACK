
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  sender?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-20 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto"
          >
            <div className={`
              min-w-[300px] max-w-[400px] p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start gap-4
              ${toast.type === 'success' ? 'bg-emerald-50/90 dark:bg-emerald-900/90 border-emerald-100 dark:border-emerald-800' : ''}
              ${toast.type === 'error' ? 'bg-red-50/90 dark:bg-red-900/90 border-red-100 dark:border-red-800' : ''}
              ${toast.type === 'warning' ? 'bg-amber-50/90 dark:bg-amber-900/90 border-amber-100 dark:border-amber-800' : ''}
              ${toast.type === 'info' ? 'bg-blue-50/90 dark:bg-blue-900/90 border-blue-100 dark:border-blue-800' : ''}
            `}>
              <div className={`
                p-2 rounded-xl shrink-0
                ${toast.type === 'success' ? 'bg-emerald-500 text-white' : ''}
                ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
                ${toast.type === 'warning' ? 'bg-amber-500 text-white' : ''}
                ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
              `}>
                {toast.type === 'success' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                {toast.type === 'error' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
                {toast.type === 'warning' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                {toast.type === 'info' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              </div>
              
              <div className="flex-1 min-w-0">
                {toast.sender && (
                  <p className={`text-[10px] font-black uppercase mb-0.5 tracking-widest
                    ${toast.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : ''}
                    ${toast.type === 'error' ? 'text-red-600 dark:text-red-400' : ''}
                    ${toast.type === 'warning' ? 'text-amber-600 dark:text-amber-400' : ''}
                    ${toast.type === 'info' ? 'text-blue-600 dark:text-blue-400' : ''}
                  `}>
                    {toast.sender}
                  </p>
                )}
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                  {toast.message}
                </p>
              </div>

              <button 
                onClick={() => onClose(toast.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast;
