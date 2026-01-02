import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto close after 4s
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const bgColors = {
    success: 'bg-emerald-600/90 border-emerald-500/50',
    error: 'bg-red-600/90 border-red-500/50',
    info: 'bg-blue-600/90 border-blue-500/50'
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-white" />,
    error: <AlertCircle className="w-5 h-5 text-white" />,
    info: <Info className="w-5 h-5 text-white" />
  };

  return (
    <div className={`fixed top-6 right-6 z-[300] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-white animate-in slide-in-from-top-2 fade-in duration-300 max-w-sm ${bgColors[type]}`}>
      <div className="shrink-0">
        {icons[type]}
      </div>
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;