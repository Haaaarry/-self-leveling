'use client';

import { create } from 'zustand';
import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'achievement';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }));
    
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// 全局提示函数
export const toast = {
  success: (message: string) => useToastStore.getState().addToast('success', message),
  error: (message: string) => useToastStore.getState().addToast('error', message),
  info: (message: string) => useToastStore.getState().addToast('info', message),
  warning: (message: string) => useToastStore.getState().addToast('warning', message),
  achievement: (message: string) => useToastStore.getState().addToast('achievement', message, 5000),
};

// Toast 显示组件
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 入场动画
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const typeStyles = {
    success: 'bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-400 shadow-emerald-500/30',
    error: 'bg-gradient-to-r from-red-600 to-red-500 border-red-400 shadow-red-500/30',
    info: 'bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400 shadow-blue-500/30',
    warning: 'bg-gradient-to-r from-amber-600 to-amber-500 border-amber-400 shadow-amber-500/30',
    achievement: 'bg-gradient-to-r from-purple-600 to-pink-500 border-pink-400 shadow-pink-500/30 animate-pulse',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
    achievement: '🏆',
  };

  return (
    <div
      className={`
        pointer-events-auto
        flex items-center gap-3 px-5 py-4 rounded-lg border-2
        shadow-xl backdrop-blur-sm
        transform transition-all duration-300 ease-out
        ${typeStyles[toast.type]}
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{
        boxShadow: `0 0 20px ${toast.type === 'achievement' ? 'rgba(168, 85, 247, 0.5)' : 'rgba(0,0,0,0.3)'}`,
      }}
    >
      <span className="text-xl">{icons[toast.type]}</span>
      <p className="text-white font-semibold text-sm flex-1">{toast.message}</p>
      <button
        onClick={handleClose}
        className="text-white/70 hover:text-white transition-colors text-lg"
      >
        ×
      </button>
    </div>
  );
}
