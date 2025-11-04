'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { Notification } from '@/services/notificationService';
import { useNotifications } from '@/contexts/NotificationContext';

interface NotificationToastProps {
  notification: Notification;
}

function NotificationToast({ notification }: NotificationToastProps) {
  const { dismissToast, markAsRead } = useNotifications();

  const handleDismiss = () => {
    dismissToast(notification.id);
    if (notification.status === 'pending') {
      markAsRead(notification.id);
    }
  };

  const getIcon = () => {
    switch (notification.notification_type) {
      case 'emergency_alert':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'lab_result_ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'appointment_reminder':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'discharge_complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBgColor = () => {
    switch (notification.notification_type) {
      case 'emergency_alert':
        return 'bg-red-50 border-red-200';
      case 'lab_result_ready':
        return 'bg-green-50 border-green-200';
      case 'appointment_reminder':
        return 'bg-blue-50 border-blue-200';
      case 'discharge_complete':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`w-96 p-4 rounded-lg border-2 shadow-lg ${getBgColor()} cursor-pointer hover:shadow-xl transition-shadow`}
      onClick={handleDismiss}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

        <div className="flex-1 min-w-0">
          {notification.subject && (
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {notification.subject}
            </h4>
          )}
          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
            {notification.message}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {new Date(notification.created_at).toLocaleTimeString()}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function NotificationToastContainer() {
  const { toasts } = useNotifications();

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence>
          {toasts.map((toast) => (
            <div key={toast.id} className="mb-3">
              <NotificationToast notification={toast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
