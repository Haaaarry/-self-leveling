'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-opacity duration-300
        ${isVisible ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'}
      `}
      onClick={onCancel}
    >
      <div
        className={`
          w-full max-w-md
          bg-gradient-to-b from-slate-800 to-slate-900
          border-2 border-cyan-500/50
          rounded-xl shadow-2xl shadow-cyan-500/20
          transform transition-all duration-300
          ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-slate-300">{message}</p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-all hover:scale-105"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`
              px-5 py-2 rounded-lg font-bold transition-all hover:scale-105
              ${confirmVariant === 'danger'
                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/30'
                : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/30'
              }
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
