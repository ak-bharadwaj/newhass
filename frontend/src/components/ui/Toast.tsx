"use client"

/**
 * Toast notification system for success/error/warning/info messages
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration: number = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, message, duration };
    
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast('warning', message, duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast('info', message, duration);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => onRemove(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const icons: Record<ToastType, React.ElementType> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
      icon: 'text-green-400',
    },
    error: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      icon: 'text-red-400',
    },
    warning: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30',
      icon: 'text-yellow-400',
    },
    info: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      icon: 'text-blue-400',
    },
  };

  const Icon = icons[toast.type];
  const color = colors[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-lg border ${color.bg} ${color.border} min-w-[320px] max-w-md`}
    >
      {/* Icon */}
      <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${color.icon}`} />
      
      {/* Message */}
      <p className="flex-1 font-medium text-white text-sm leading-relaxed">
        {toast.message}
      </p>
      
      {/* Close Button */}
      <button
        onClick={onClose}
        className="flex-shrink-0 text-white/60 hover:text-white hover:scale-110 transition-all duration-200 ml-2"
        aria-label="Close notification"
      >
        <X className="w-5 h-5" />
      </button>
    </motion.div>
  );
};

// Utility hook for common toast patterns
export const useNotification = () => {
  const toast = useToast();

  return {
    ...toast,
    // Common patterns
    saveSuccess: () => toast.success('Changes saved successfully!'),
    saveError: () => toast.error('Failed to save changes. Please try again.'),
    deleteSuccess: (item: string = 'Item') => toast.success(`${item} deleted successfully!`),
    deleteError: (item: string = 'Item') => toast.error(`Failed to delete ${item.toLowerCase()}. Please try again.`),
    createSuccess: (item: string = 'Item') => toast.success(`${item} created successfully!`),
    createError: (item: string = 'Item') => toast.error(`Failed to create ${item.toLowerCase()}. Please try again.`),
    updateSuccess: (item: string = 'Item') => toast.success(`${item} updated successfully!`),
    updateError: (item: string = 'Item') => toast.error(`Failed to update ${item.toLowerCase()}. Please try again.`),
    loadError: () => toast.error('Failed to load data. Please refresh the page.'),
    networkError: () => toast.error('Network error. Please check your connection.'),
    unauthorized: () => toast.error('You do not have permission to perform this action.'),
    comingSoon: () => toast.info('This feature is coming soon!'),
  };
};
